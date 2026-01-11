import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function getDb() {
  return admin.firestore();
}

export async function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<void> {
  const db = getDb();
  const docRef = db.collection('rateLimits').doc(identifier);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      let timestamps: number[] = doc.exists ? (doc.data()?.timestamps || []) : [];

      // Filter out old timestamps
      timestamps = timestamps.filter(ts => ts > windowStart);

      if (timestamps.length >= config.maxRequests) {
        throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
      }

      timestamps.push(now);
      transaction.set(docRef, { timestamps, updatedAt: now }, { merge: true });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    // If Firestore fails, log and continue (fail-open for availability)
    console.warn('Rate limit check failed:', error);
  }
}

export const RATE_LIMITS = {
  verifyAdmin: { maxRequests: 5, windowMs: 5 * 60 * 1000 },
  transformImage: { maxRequests: 30, windowMs: 60 * 1000 },
  adminOperations: { maxRequests: 30, windowMs: 60 * 1000 },
};
