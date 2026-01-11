import { Timestamp } from 'firebase/firestore';
import type { Event, Photo, ThemeId } from '../types';

/**
 * Convert Firestore Timestamp to Date
 */
export function convertTimestamp(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) {
    return new Date();
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
}

/**
 * Validate that required fields exist on a Firestore document
 */
function validateRequiredFields(
  data: Record<string, unknown>,
  fields: string[],
  docType: string
): void {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`Invalid ${docType} document: missing required field '${field}'`);
    }
  }
}

/**
 * Convert Firestore document to Event object
 */
export function eventFromFirestore(id: string, data: Record<string, unknown>): Event {
  validateRequiredFields(data, ['name', 'slug', 'date', 'isActive'], 'event');

  return {
    id,
    name: data.name as string,
    slug: data.slug as string,
    date: convertTimestamp(data.date as Timestamp),
    createdAt: convertTimestamp(data.createdAt as Timestamp),
    isActive: data.isActive as boolean,
    theme: (data.theme as ThemeId) || 'default',
  };
}

/**
 * Convert Firestore document to Photo object
 */
export function photoFromFirestore(id: string, data: Record<string, unknown>): Photo {
  validateRequiredFields(data, ['eventId', 'styleId', 'imageUrl'], 'photo');

  return {
    id,
    eventId: data.eventId as string,
    styleId: data.styleId as string,
    imageUrl: data.imageUrl as string,
    thumbnailUrl: (data.thumbnailUrl as string) || (data.imageUrl as string),
    createdAt: convertTimestamp(data.createdAt as Timestamp),
    storagePath: data.storagePath as string,
  };
}
