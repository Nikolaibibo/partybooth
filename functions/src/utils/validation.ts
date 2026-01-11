import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const MAX_IMAGE_SIZE_BYTES = 9 * 1024 * 1024; // 9MB base64 (~6.75MB actual)

export function requireString(value: unknown, fieldName: string): asserts value is string {
  if (!value || typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${fieldName} is required`);
  }
}

export function requireImageBase64(value: unknown, fieldName: string): asserts value is string {
  requireString(value, fieldName);

  const validPrefixes = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'];
  if (!validPrefixes.some(prefix => (value as string).startsWith(prefix))) {
    throw new HttpsError('invalid-argument', 'Invalid image format. Must be JPEG, PNG, or WebP.');
  }

  if ((value as string).length > MAX_IMAGE_SIZE_BYTES) {
    throw new HttpsError('invalid-argument', 'Image too large. Maximum size is 9MB.');
  }
}

export function requireArray<T>(value: unknown, fieldName: string): asserts value is T[] {
  if (!value || !Array.isArray(value) || value.length === 0) {
    throw new HttpsError('invalid-argument', `${fieldName} array is required`);
  }
}

export async function checkSlugUniqueness(
  db: admin.firestore.Firestore,
  slug: string,
  excludeEventId?: string
): Promise<void> {
  const existing = await db
    .collection('events')
    .where('slug', '==', slug)
    .get();

  const conflict = existing.docs.find(doc => doc.id !== excludeEventId);
  if (conflict) {
    throw new HttpsError('already-exists', 'An event with this slug already exists');
  }
}
