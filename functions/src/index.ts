import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { randomUUID, timingSafeEqual } from 'crypto';
import sharp from 'sharp';

import { generateToken, requireAdmin } from './utils/auth';
import { requireString, requireArray, checkSlugUniqueness, requireImageBase64 } from './utils/validation';
import { deletePhotoFiles } from './utils/storage';
import { checkRateLimit, RATE_LIMITS } from './utils/rateLimit';

admin.initializeApp();

const bflApiKey = defineSecret('BFL_API_KEY');
const adminPassword = defineSecret('ADMIN_PASSWORD');
const jwtSecret = defineSecret('JWT_SECRET');

const db = admin.firestore();

// Style prompts for BFL FLUX Kontext
const STYLE_PROMPTS: Record<string, string> = {
  vintage:
    "Apply vintage 1970s film photograph style to this portrait: warm amber color tones, natural film grain texture, slightly faded highlights, and soft vignette edges. Maintain the person's exact facial features, expression, hairstyle, and pose while applying the vintage color treatment.",
  comic:
    "Add comic book ink outline effect to this portrait: add bold black ink lines along facial features, hair edges, and clothing contours. Slightly boost color saturation. Keep the original photo visible with the ink lines overlaid. Do NOT change the person's face - only add the outline effect.",
  renaissance:
    "Add dramatic Renaissance-style chiaroscuro lighting to this portrait: warm golden light from one side casting soft shadows across the face, rich deep shadows on the opposite side. Add a dark, painterly background with subtle texture. Maintain the person's exact facial features, expression, and likeness - apply only lighting and background changes.",
  cyberpunk:
    "Add cyberpunk neon lighting effects to this portrait: bright pink and cyan rim lights on the edges of the face and hair, subtle purple ambient glow. Add a dark futuristic city background with neon signs. Maintain the person's exact facial features, expression, and pose - apply only lighting and background changes.",
  watercolor:
    "Apply delicate watercolor painting style to this portrait: soft flowing colors that blend at edges, visible paper texture throughout, gentle brushstroke effects, slightly muted pastel tones. Maintain the person's exact facial features, expression, and likeness while applying the watercolor artistic rendering.",
  'pop-art':
    "Apply Andy Warhol silk-screen pop art style to this portrait: bold flat color blocks in neon pink, electric blue, bright yellow, high contrast with minimal shading, screen-print aesthetic with slightly offset color registration. Poster-like graphic quality. Maintain the person's exact face shape, features, and expression.",
  sketch:
    "Transform this portrait into a detailed pencil sketch drawing: use graphite pencil shading techniques with crosshatching for shadows, clean defined lines for features, visible paper texture background, high contrast between light and dark areas. Maintain the person's exact facial features, expression, and likeness while applying the hand-drawn pencil sketch artistic style.",
  sparkle:
    "Add magical sparkle overlay effects around this portrait: scattered light particles and star-shaped lens flares floating around the subject, iridescent highlights on hair edges, fairy-dust particle overlay in the air. Do NOT alter the person's face or skin - only add sparkle effects around and near them.",
  disco:
    "Add 1970s disco lighting effects to this portrait: colorful light reflections as if from a disco ball casting pink/purple/blue colored light on the subject, light streaks, retro film grain texture. Add a dark background with scattered disco light spots. Do NOT alter the person's face - only add lighting and color effects.",
  polaroid:
    "Apply authentic Polaroid instant film style to this portrait: slightly faded colors with warm yellowish tint, soft vignette corners, subtle light leak effects, characteristic Polaroid color rendering with boosted warm tones. Maintain the person's exact facial features and expression while applying the vintage instant film aesthetic.",
  pixel:
    "Transform this portrait into pixel art style: reduce to chunky visible pixels like 8-bit retro video game graphics, limited color palette, blocky pixelated features while maintaining recognizable likeness. Apply retro gaming aesthetic with clean pixel edges.",
  cartoon:
    "Apply soft cartoon illustration style to this portrait. Smooth skin, slightly stylized features like Disney/Pixar animation, bright colors, clean lines. Keep the likeness recognizable while adding gentle cartoon aesthetic.",
  champagne:
    "Add golden champagne bubbles floating effect around the subject. Sparkling gold bubbles and fizz particles throughout the frame, celebration atmosphere with warm golden glow. Do NOT change the person - only add bubble overlay effect.",
  'floral-frame':
    "Add delicate floral frame around the edges of this portrait. Soft flowers and botanical elements as border overlay, elegant wedding bouquet style with roses and greenery. Do NOT change the person - only add floral border decoration.",
  'golden-hour':
    "Apply warm golden hour sunset lighting to this portrait. Soft warm orange glow, gentle lens flare, golden sunlight atmosphere with warm color grading. Do NOT change the person - only adjust lighting warmth and add golden tones.",
  magazine:
    "Transform into a glossy magazine cover layout. Add bold headline text at top, subheadlines, barcode in corner, magazine title logo. High fashion editorial lighting with slight skin smoothing. Professional magazine cover composition with text overlays.",
};

interface FluxSubmitResponse {
  id: string;
  polling_url: string;
}

interface FluxResultResponse {
  id: string;
  status: 'Pending' | 'Ready' | 'Error' | 'Request Moderated' | 'Content Moderated';
  result?: { sample: string };
}

async function submitToFlux(apiKey: string, prompt: string, imageBase64: string): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-key': apiKey },
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
    throw new HttpsError('internal', `FLUX API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as FluxSubmitResponse;
  return data.polling_url;
}

async function pollForResult(apiKey: string, pollingUrl: string, maxWaitMs = 50000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(pollingUrl, { headers: { 'x-key': apiKey } });

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw new HttpsError('internal', `Failed to check result: ${response.status}`);
    }

    const data = (await response.json()) as FluxResultResponse;

    if (data.status === 'Ready' && data.result?.sample) {
      return data.result.sample;
    }

    if (data.status === 'Error' || data.status === 'Request Moderated' || data.status === 'Content Moderated') {
      throw new HttpsError('internal', `Processing failed: ${data.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new HttpsError('deadline-exceeded', 'Image processing timed out');
}

async function downloadAndStoreImage(signedUrl: string, eventId: string) {
  const imageResponse = await fetch(signedUrl);
  if (!imageResponse.ok) throw new HttpsError('internal', 'Failed to download processed image');

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const timestamp = Date.now();
  const uuid = randomUUID();
  const bucket = admin.storage().bucket();

  const imagePath = `photos/${eventId}/${timestamp}_${uuid}.jpg`;
  const thumbPath = `photos/${eventId}/thumbs/${timestamp}_${uuid}_thumb.jpg`;

  const thumbnailBuffer = await sharp(imageBuffer).resize(400, 400, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();

  await Promise.all([
    bucket.file(imagePath).save(imageBuffer, { metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' } }),
    bucket.file(thumbPath).save(thumbnailBuffer, { metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' } }),
  ]);

  await Promise.all([bucket.file(imagePath).makePublic(), bucket.file(thumbPath).makePublic()]);

  return {
    imageUrl: `https://storage.googleapis.com/${bucket.name}/${imagePath}`,
    thumbnailUrl: `https://storage.googleapis.com/${bucket.name}/${thumbPath}`,
    storagePath: imagePath,
  };
}

// ============================================================
// Image Transform Function
// ============================================================

export const transformImage = onCall(
  { region: 'europe-west1', secrets: [bflApiKey], timeoutSeconds: 120, memory: '1GiB', cors: true },
  async (request): Promise<{ imageUrl: string }> => {
    const { imageBase64, styleId, eventId } = request.data as { imageBase64: string; styleId: string; eventId: string };

    requireImageBase64(imageBase64, 'imageBase64');
    requireString(styleId, 'styleId');
    requireString(eventId, 'eventId');

    // Rate limit
    const clientIp = request.rawRequest?.ip || 'unknown';
    await checkRateLimit(`transform:${eventId}:${clientIp}`, RATE_LIMITS.transformImage);

    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) throw new HttpsError('not-found', 'Event not found');
    const eventData = eventDoc.data();
    if (!eventData?.isActive) throw new HttpsError('failed-precondition', 'Event is not active');

    // Check photo limit
    const maxPhotos = eventData.maxPhotos as number | undefined;
    if (maxPhotos !== undefined && maxPhotos > 0) {
      const photosSnapshot = await db.collection('photos')
        .where('eventId', '==', eventId)
        .count()
        .get();
      const currentCount = photosSnapshot.data().count;
      if (currentCount >= maxPhotos) {
        throw new HttpsError('resource-exhausted', `Photo limit reached (${maxPhotos})`);
      }
    }

    const prompt = STYLE_PROMPTS[styleId];
    if (!prompt) throw new HttpsError('invalid-argument', `Unknown style: ${styleId}`);

    console.log(`Processing image for event ${eventId} with style: ${styleId}`);

    try {
      const pollingUrl = await submitToFlux(bflApiKey.value(), prompt, imageBase64);
      const signedUrl = await pollForResult(bflApiKey.value(), pollingUrl);
      const { imageUrl, thumbnailUrl, storagePath } = await downloadAndStoreImage(signedUrl, eventId);

      await db.collection('photos').add({
        eventId, styleId, imageUrl, thumbnailUrl, storagePath,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { imageUrl };
    } catch (error) {
      console.error('Transform error:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to process image. Please try again.');
    }
  }
);

// ============================================================
// Admin Authentication
// ============================================================

export const verifyAdmin = onCall(
  { region: 'europe-west1', secrets: [adminPassword, jwtSecret] },
  async (request): Promise<{ token: string }> => {
    const { password } = request.data as { password: string };

    const clientIp = request.rawRequest?.ip || 'unknown';
    await checkRateLimit(`login:${clientIp}`, RATE_LIMITS.verifyAdmin);

    requireString(password, 'password');

    const storedPassword = adminPassword.value();
    const inputBuffer = Buffer.from(password);
    const storedBuffer = Buffer.from(storedPassword);

    if (inputBuffer.length !== storedBuffer.length || !timingSafeEqual(inputBuffer, storedBuffer)) {
      throw new HttpsError('permission-denied', 'Invalid password');
    }

    return { token: generateToken(jwtSecret.value()) };
  }
);

// ============================================================
// Event Management
// ============================================================

export const createEvent = onCall(
  { region: 'europe-west1', secrets: [jwtSecret] },
  async (request): Promise<{ eventId: string }> => {
    const { name, slug, date, isActive, theme, maxPhotos, token } = request.data as {
      name: string; slug: string; date: string; isActive: boolean; theme?: string; maxPhotos?: number; token: string;
    };

    requireAdmin(token, jwtSecret.value());
    await checkRateLimit(`admin:${token.slice(-8)}`, RATE_LIMITS.adminOperations);

    requireString(name, 'name');
    requireString(slug, 'slug');
    if (!date) throw new HttpsError('invalid-argument', 'date is required');

    await checkSlugUniqueness(db, slug);

    const eventData: Record<string, unknown> = {
      name, slug, date: new Date(date), isActive: isActive ?? true, theme: theme || 'default',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (maxPhotos !== undefined && maxPhotos > 0) {
      eventData.maxPhotos = maxPhotos;
    }

    const eventRef = await db.collection('events').add(eventData);

    return { eventId: eventRef.id };
  }
);

export const updateEvent = onCall(
  { region: 'europe-west1', secrets: [jwtSecret] },
  async (request): Promise<void> => {
    const { eventId, updates, token } = request.data as {
      eventId: string; updates: { name?: string; slug?: string; date?: string; isActive?: boolean; theme?: string; maxPhotos?: number | null }; token: string;
    };

    requireAdmin(token, jwtSecret.value());
    await checkRateLimit(`admin:${token.slice(-8)}`, RATE_LIMITS.adminOperations);
    requireString(eventId, 'eventId');

    const eventRef = db.collection('events').doc(eventId);
    if (!(await eventRef.get()).exists) throw new HttpsError('not-found', 'Event not found');

    if (updates.slug) await checkSlugUniqueness(db, updates.slug, eventId);

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.date !== undefined) updateData.date = new Date(updates.date);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.theme !== undefined) updateData.theme = updates.theme;
    if (updates.maxPhotos !== undefined) {
      // null removes the limit, positive number sets it
      if (updates.maxPhotos === null) {
        updateData.maxPhotos = admin.firestore.FieldValue.delete();
      } else if (updates.maxPhotos > 0) {
        updateData.maxPhotos = updates.maxPhotos;
      }
    }

    await eventRef.update(updateData);
  }
);

export const deleteEvent = onCall(
  { region: 'europe-west1', secrets: [jwtSecret], timeoutSeconds: 300 },
  async (request): Promise<{ deletedPhotos: number }> => {
    const { eventId, token } = request.data as { eventId: string; token: string };

    requireAdmin(token, jwtSecret.value());
    await checkRateLimit(`admin:${token.slice(-8)}`, RATE_LIMITS.adminOperations);
    requireString(eventId, 'eventId');

    const eventRef = db.collection('events').doc(eventId);
    if (!(await eventRef.get()).exists) throw new HttpsError('not-found', 'Event not found');

    // Delete all photos for this event
    const photosSnapshot = await db.collection('photos').where('eventId', '==', eventId).get();
    let deletedPhotos = 0;

    // Process in batches of 10 for parallel deletion
    const photoChunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
    for (let i = 0; i < photosSnapshot.docs.length; i += 10) {
      photoChunks.push(photosSnapshot.docs.slice(i, i + 10));
    }

    for (const chunk of photoChunks) {
      await Promise.all(
        chunk.map(async (photoDoc) => {
          try {
            await deletePhotoFiles(photoDoc.data()?.storagePath);
            await photoDoc.ref.delete();
            deletedPhotos++;
          } catch (err) {
            console.warn(`Failed to delete photo ${photoDoc.id}:`, err);
          }
        })
      );
    }

    // Delete the event
    await eventRef.delete();

    return { deletedPhotos };
  }
);

// ============================================================
// Photo Management
// ============================================================

export const deletePhoto = onCall(
  { region: 'europe-west1', secrets: [jwtSecret] },
  async (request): Promise<void> => {
    const { photoId, token } = request.data as { photoId: string; token: string };

    requireAdmin(token, jwtSecret.value());
    await checkRateLimit(`admin:${token.slice(-8)}`, RATE_LIMITS.adminOperations);
    requireString(photoId, 'photoId');

    const photoRef = db.collection('photos').doc(photoId);
    const photoDoc = await photoRef.get();
    if (!photoDoc.exists) throw new HttpsError('not-found', 'Photo not found');

    await deletePhotoFiles(photoDoc.data()?.storagePath);
    await photoRef.delete();
  }
);

export const deletePhotos = onCall(
  { region: 'europe-west1', secrets: [jwtSecret], timeoutSeconds: 60 },
  async (request): Promise<{ deleted: number; failed: number }> => {
    const { photoIds, token } = request.data as { photoIds: string[]; token: string };

    requireAdmin(token, jwtSecret.value());
    await checkRateLimit(`admin:${token.slice(-8)}`, RATE_LIMITS.adminOperations);
    requireArray(photoIds, 'photoIds');

    if (photoIds.length > 100) throw new HttpsError('invalid-argument', 'Maximum 100 photos per request');

    let deleted = 0, failed = 0;

    for (const photoId of photoIds) {
      try {
        const photoRef = db.collection('photos').doc(photoId);
        const photoDoc = await photoRef.get();
        if (!photoDoc.exists) { failed++; continue; }

        await deletePhotoFiles(photoDoc.data()?.storagePath);
        await photoRef.delete();
        deleted++;
      } catch (err) {
        console.error(`Failed to delete photo ${photoId}:`, err);
        failed++;
      }
    }

    return { deleted, failed };
  }
);
