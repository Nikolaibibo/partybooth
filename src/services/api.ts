import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { CONFIG } from '../config';

interface TransformRequest {
  imageBase64: string;
  styleId: string;
  eventId: string;
}

interface TransformResponse {
  imageUrl: string;
}

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(code?: string): boolean {
  return (
    code === 'functions/deadline-exceeded' ||
    code === 'functions/unavailable' ||
    code === 'functions/internal' ||
    code === 'functions/unknown'
  );
}

export async function transformImage(
  imageBase64: string,
  styleId: string,
  eventId: string
): Promise<string> {
  const callable = httpsCallable<TransformRequest, TransformResponse>(
    functions,
    'transformImage',
    { timeout: CONFIG.API_TIMEOUT_MS }
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Check if we're online before attempting
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }

      const result = await callable({ imageBase64, styleId, eventId });
      return result.data.imageUrl;
    } catch (error) {
      const err = error as { code?: string; message?: string };

      // Don't retry non-retryable errors
      if (!isRetryableError(err.code) && err.code) {
        // User-facing error messages
        if (err.code === 'functions/not-found') {
          throw new Error('Event not found. Please refresh and try again.');
        }
        if (err.code === 'functions/failed-precondition') {
          throw new Error('Event is not active.');
        }
        if (err.code === 'functions/invalid-argument') {
          throw new Error('Invalid request. Please try again.');
        }
        throw new Error(err.message || 'Something went wrong. Please try again.');
      }

      lastError = new Error(
        err.code === 'functions/deadline-exceeded'
          ? 'Processing took too long. Please try again.'
          : err.code === 'functions/unavailable'
          ? 'Service temporarily unavailable. Please try again.'
          : err.message || 'Something went wrong. Please try again.'
      );

      // If we have retries left, wait and try again
      if (attempt < MAX_RETRIES) {
        console.log(`Attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Processing failed after multiple attempts. Please try again.');
}
