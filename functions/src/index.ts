import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

admin.initializeApp();

const bflApiKey = defineSecret('BFL_API_KEY');
const adminPassword = defineSecret('ADMIN_PASSWORD');

const db = admin.firestore();

// Style prompts for BFL FLUX Kontext
const STYLE_PROMPTS: Record<string, string> = {
  vintage:
    "Apply vintage 1970s film photograph style to this portrait: warm amber color tones, natural film grain texture, slightly faded highlights, and soft vignette edges. Maintain the person's exact facial features, expression, hairstyle, and pose while applying the vintage color treatment.",
  comic:
    "Apply bold comic book illustration style to this portrait: thick black ink outlines around features, cel-shaded flat coloring, halftone dot patterns in shadow areas, high dynamic contrast. Maintain the person's exact facial features, expression, and pose while adding the comic art rendering style.",
  renaissance:
    "Add dramatic Renaissance-style chiaroscuro lighting to this portrait: warm golden light from one side casting soft shadows across the face, rich deep shadows on the opposite side. Add a dark, painterly background with subtle texture. Maintain the person's exact facial features, expression, and likeness - apply only lighting and background changes.",
  cyberpunk:
    "Add cyberpunk neon lighting effects to this portrait: bright pink and cyan rim lights on the edges of the face and hair, subtle purple ambient glow. Add a dark futuristic city background with neon signs. Maintain the person's exact facial features, expression, and pose - apply only lighting and background changes.",
  watercolor:
    "Apply delicate watercolor painting style to this portrait: soft flowing colors that blend at edges, visible paper texture throughout, gentle brushstroke effects, slightly muted pastel tones. Maintain the person's exact facial features, expression, and likeness while applying the watercolor artistic rendering.",
  'pop-art':
    "Apply bold Andy Warhol-style pop art treatment to this portrait: flatten colors into bright graphic blocks, dramatically increase contrast, add halftone dot patterns in midtones and shadows, use vibrant saturated colors. Maintain the person's exact face shape, features, and expression while applying the pop art color style.",
};

interface TransformRequest {
  imageBase64: string;
  styleId: string;
  eventId: string;
}

interface TransformResponse {
  imageUrl: string;
}

interface FluxSubmitResponse {
  id: string;
  polling_url: string;
}

interface FluxResultResponse {
  id: string;
  status: 'Pending' | 'Ready' | 'Error' | 'Request Moderated' | 'Content Moderated';
  result?: {
    sample: string;
  };
}

async function submitToFlux(
  apiKey: string,
  prompt: string,
  imageBase64: string
): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-key': apiKey,
    },
    body: JSON.stringify({
      prompt,
      input_image: base64Data,
      output_format: 'jpeg',
      safety_tolerance: 2,
      aspect_ratio: '4:3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('FLUX API error:', response.status, error);
    throw new HttpsError(
      'internal',
      `FLUX API error: ${response.status} - ${error}`
    );
  }

  const data = (await response.json()) as FluxSubmitResponse;
  console.log('FLUX submit response:', JSON.stringify(data));
  return data.polling_url;
}

async function pollForResult(
  apiKey: string,
  pollingUrl: string,
  maxWaitMs = 60000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(pollingUrl, {
      headers: { 'x-key': apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Poll error:', response.status, errorText);
      if (response.status === 429 || response.status >= 500) {
        console.log('Retrying after error...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw new HttpsError('internal', `Failed to check result: ${response.status}`);
    }

    const data = (await response.json()) as FluxResultResponse;
    console.log('Poll status:', data.status, JSON.stringify(data));

    if (data.status === 'Ready' && data.result?.sample) {
      return data.result.sample;
    }

    if (
      data.status === 'Error' ||
      data.status === 'Request Moderated' ||
      data.status === 'Content Moderated'
    ) {
      throw new HttpsError('internal', `Processing failed: ${data.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new HttpsError('deadline-exceeded', 'Image processing timed out');
}

async function downloadAndStoreImage(
  signedUrl: string,
  eventId: string
): Promise<{ imageUrl: string; thumbnailUrl: string; storagePath: string }> {
  const imageResponse = await fetch(signedUrl);
  if (!imageResponse.ok) {
    throw new HttpsError('internal', 'Failed to download processed image');
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const timestamp = Date.now();
  const uuid = randomUUID();
  const bucket = admin.storage().bucket();

  // Full-size image path
  const imagePath = `photos/${eventId}/${timestamp}_${uuid}.jpg`;
  const imageFile = bucket.file(imagePath);

  // Thumbnail path
  const thumbPath = `photos/${eventId}/thumbs/${timestamp}_${uuid}_thumb.jpg`;
  const thumbFile = bucket.file(thumbPath);

  // Generate thumbnail using Sharp
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();

  // Upload both in parallel
  await Promise.all([
    imageFile.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    }),
    thumbFile.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    }),
  ]);

  // Make both public
  await Promise.all([imageFile.makePublic(), thumbFile.makePublic()]);

  return {
    imageUrl: `https://storage.googleapis.com/${bucket.name}/${imagePath}`,
    thumbnailUrl: `https://storage.googleapis.com/${bucket.name}/${thumbPath}`,
    storagePath: imagePath,
  };
}

export const transformImage = onCall(
  {
    region: 'europe-west1',
    secrets: [bflApiKey],
    timeoutSeconds: 120,
    memory: '1GiB',
    cors: true,
  },
  async (request): Promise<TransformResponse> => {
    const { imageBase64, styleId, eventId } = request.data as TransformRequest;

    // Validate inputs
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'imageBase64 is required');
    }

    if (!styleId || typeof styleId !== 'string') {
      throw new HttpsError('invalid-argument', 'styleId is required');
    }

    if (!eventId || typeof eventId !== 'string') {
      throw new HttpsError('invalid-argument', 'eventId is required');
    }

    // Verify event exists and is active
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event not found');
    }
    const eventData = eventDoc.data();
    if (!eventData?.isActive) {
      throw new HttpsError('failed-precondition', 'Event is not active');
    }

    const prompt = STYLE_PROMPTS[styleId];
    if (!prompt) {
      throw new HttpsError('invalid-argument', `Unknown style: ${styleId}`);
    }

    console.log(`Processing image for event ${eventId} with style: ${styleId}`);

    try {
      // 1. Submit to FLUX API
      const pollingUrl = await submitToFlux(bflApiKey.value(), prompt, imageBase64);
      console.log('FLUX polling URL:', pollingUrl);

      // 2. Poll for result
      const signedUrl = await pollForResult(bflApiKey.value(), pollingUrl);
      console.log('Got signed URL, downloading...');

      // 3. Download, generate thumbnail, and store in Cloud Storage
      const { imageUrl, thumbnailUrl, storagePath } = await downloadAndStoreImage(
        signedUrl,
        eventId
      );
      console.log('Stored at:', imageUrl);

      // 3. Create photo document in Firestore
      await db.collection('photos').add({
        eventId,
        styleId,
        imageUrl,
        thumbnailUrl,
        storagePath,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { imageUrl };
    } catch (error) {
      console.error('Transform error:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to process image. Please try again.'
      );
    }
  }
);

// ============================================================
// Admin Functions
// ============================================================

function generateToken(eventId: string): string {
  const payload = {
    admin: true,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    id: eventId,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.admin === true && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const verifyAdmin = onCall(
  {
    region: 'europe-west1',
    secrets: [adminPassword],
  },
  async (request): Promise<{ token: string }> => {
    const { password } = request.data as { password: string };

    if (!password) {
      throw new HttpsError('invalid-argument', 'Password is required');
    }

    // Compare with stored password (simple comparison for MVP)
    const storedPassword = adminPassword.value();
    if (password !== storedPassword) {
      throw new HttpsError('permission-denied', 'Invalid password');
    }

    // Generate a simple token
    const token = generateToken(randomUUID());
    return { token };
  }
);

interface CreateEventInput {
  name: string;
  slug: string;
  date: Date | string;
  isActive: boolean;
  theme?: string;
  token: string;
}

export const createEvent = onCall(
  {
    region: 'europe-west1',
    secrets: [adminPassword],
  },
  async (request): Promise<{ eventId: string }> => {
    const { name, slug, date, isActive, theme, token } = request.data as CreateEventInput;

    // Verify admin token
    if (!verifyToken(token)) {
      throw new HttpsError('permission-denied', 'Invalid or expired token');
    }

    // Validate inputs
    if (!name || !slug || !date) {
      throw new HttpsError('invalid-argument', 'name, slug, and date are required');
    }

    // Check slug uniqueness
    const existingSlug = await db
      .collection('events')
      .where('slug', '==', slug)
      .get();
    if (!existingSlug.empty) {
      throw new HttpsError('already-exists', 'An event with this slug already exists');
    }

    // Create event
    const eventRef = await db.collection('events').add({
      name,
      slug,
      date: new Date(date),
      isActive: isActive ?? true,
      theme: theme || 'default',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { eventId: eventRef.id };
  }
);

interface UpdateEventInput {
  eventId: string;
  updates: {
    name?: string;
    slug?: string;
    date?: Date | string;
    isActive?: boolean;
    theme?: string;
  };
  token: string;
}

export const updateEvent = onCall(
  {
    region: 'europe-west1',
    secrets: [adminPassword],
  },
  async (request): Promise<void> => {
    const { eventId, updates, token } = request.data as UpdateEventInput;

    if (!verifyToken(token)) {
      throw new HttpsError('permission-denied', 'Invalid or expired token');
    }

    if (!eventId) {
      throw new HttpsError('invalid-argument', 'eventId is required');
    }

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event not found');
    }

    // If slug is being updated, check uniqueness
    if (updates.slug) {
      const existingSlug = await db
        .collection('events')
        .where('slug', '==', updates.slug)
        .get();
      const otherEventWithSlug = existingSlug.docs.find((doc) => doc.id !== eventId);
      if (otherEventWithSlug) {
        throw new HttpsError('already-exists', 'An event with this slug already exists');
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.date !== undefined) updateData.date = new Date(updates.date);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.theme !== undefined) updateData.theme = updates.theme;

    await eventRef.update(updateData);
  }
);

interface DeleteEventInput {
  eventId: string;
  token: string;
}

export const deleteEvent = onCall(
  {
    region: 'europe-west1',
    secrets: [adminPassword],
  },
  async (request): Promise<void> => {
    const { eventId, token } = request.data as DeleteEventInput;

    if (!verifyToken(token)) {
      throw new HttpsError('permission-denied', 'Invalid or expired token');
    }

    if (!eventId) {
      throw new HttpsError('invalid-argument', 'eventId is required');
    }

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event not found');
    }

    // Delete event (photos are kept for now - could add cleanup later)
    await eventRef.delete();
  }
);

// ============================================================
// Photo Management Functions
// ============================================================

interface DeletePhotoInput {
  photoId: string;
  token: string;
}

export const deletePhoto = onCall(
  {
    region: 'europe-west1',
    secrets: [adminPassword],
  },
  async (request): Promise<void> => {
    const { photoId, token } = request.data as DeletePhotoInput;

    if (!verifyToken(token)) {
      throw new HttpsError('permission-denied', 'Invalid or expired token');
    }

    if (!photoId) {
      throw new HttpsError('invalid-argument', 'photoId is required');
    }

    // Get photo document
    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();

    if (!photoDoc.exists) {
      throw new HttpsError('not-found', 'Photo not found');
    }

    const photoData = photoDoc.data();
    const bucket = admin.storage().bucket();

    // Delete files from storage
    const deletePromises: Promise<unknown>[] = [];

    if (photoData?.storagePath) {
      // Delete main image
      deletePromises.push(
        bucket.file(photoData.storagePath).delete().catch((err) => {
          console.warn('Failed to delete main image:', err.message);
        })
      );

      // Delete thumbnail (derive path from storagePath)
      const thumbPath = photoData.storagePath
        .replace(`photos/`, `photos/`)
        .replace(/\/([^/]+)$/, '/thumbs/$1')
        .replace('.jpg', '_thumb.jpg');
      deletePromises.push(
        bucket.file(thumbPath).delete().catch((err) => {
          console.warn('Failed to delete thumbnail:', err.message);
        })
      );
    }

    // Delete Firestore document and storage files
    await Promise.all([...deletePromises, photoRef.delete()]);

    console.log(`Deleted photo ${photoId}`);
  }
);

interface DeletePhotosInput {
  photoIds: string[];
  token: string;
}

export const deletePhotos = onCall(
  {
    region: 'europe-west1',
    secrets: [adminPassword],
    timeoutSeconds: 60,
  },
  async (request): Promise<{ deleted: number; failed: number }> => {
    const { photoIds, token } = request.data as DeletePhotosInput;

    if (!verifyToken(token)) {
      throw new HttpsError('permission-denied', 'Invalid or expired token');
    }

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      throw new HttpsError('invalid-argument', 'photoIds array is required');
    }

    if (photoIds.length > 100) {
      throw new HttpsError('invalid-argument', 'Maximum 100 photos per request');
    }

    const bucket = admin.storage().bucket();
    let deleted = 0;
    let failed = 0;

    for (const photoId of photoIds) {
      try {
        const photoRef = db.collection('photos').doc(photoId);
        const photoDoc = await photoRef.get();

        if (!photoDoc.exists) {
          failed++;
          continue;
        }

        const photoData = photoDoc.data();
        const deletePromises: Promise<unknown>[] = [];

        if (photoData?.storagePath) {
          deletePromises.push(
            bucket.file(photoData.storagePath).delete().catch(() => {})
          );
          const thumbPath = photoData.storagePath
            .replace(/\/([^/]+)$/, '/thumbs/$1')
            .replace('.jpg', '_thumb.jpg');
          deletePromises.push(
            bucket.file(thumbPath).delete().catch(() => {})
          );
        }

        await Promise.all([...deletePromises, photoRef.delete()]);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete photo ${photoId}:`, err);
        failed++;
      }
    }

    console.log(`Bulk delete: ${deleted} deleted, ${failed} failed`);
    return { deleted, failed };
  }
);
