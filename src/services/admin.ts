import { httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { functions, db } from './firebase';
import { eventFromFirestore } from '../utils/firestore';
import type { Event, ThemeId } from '../types';

const EVENTS_COLLECTION = 'events';

// Verify admin password and get session token
export async function verifyAdmin(password: string): Promise<string> {
  const callable = httpsCallable<{ password: string }, { token: string }>(
    functions,
    'verifyAdmin'
  );

  const result = await callable({ password });
  return result.data.token;
}

// Get all events (for admin view)
export async function getAllEvents(): Promise<Event[]> {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) =>
    eventFromFirestore(doc.id, doc.data())
  );
}

// Create a new event
interface CreateEventInput {
  name: string;
  slug: string;
  date: Date;
  isActive: boolean;
  theme?: ThemeId;
}

export async function createEvent(input: CreateEventInput): Promise<string> {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const callable = httpsCallable<
    CreateEventInput & { token: string },
    { eventId: string }
  >(functions, 'createEvent');

  const result = await callable({ ...input, token });
  return result.data.eventId;
}

// Update an event
export async function updateEvent(
  eventId: string,
  updates: Partial<Pick<Event, 'name' | 'slug' | 'date' | 'isActive' | 'theme'>>
): Promise<void> {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const callable = httpsCallable<
    { eventId: string; updates: typeof updates; token: string },
    void
  >(functions, 'updateEvent');

  await callable({ eventId, updates, token });
}

// Delete an event
export async function deleteEvent(eventId: string): Promise<void> {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const callable = httpsCallable<{ eventId: string; token: string }, void>(
    functions,
    'deleteEvent'
  );

  await callable({ eventId, token });
}

// Delete a single photo
export async function deletePhoto(photoId: string): Promise<void> {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const callable = httpsCallable<{ photoId: string; token: string }, void>(
    functions,
    'deletePhoto'
  );

  await callable({ photoId, token });
}

// Delete multiple photos
export async function deletePhotos(
  photoIds: string[]
): Promise<{ deleted: number; failed: number }> {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const callable = httpsCallable<
    { photoIds: string[]; token: string },
    { deleted: number; failed: number }
  >(functions, 'deletePhotos');

  const result = await callable({ photoIds, token });
  return result.data;
}
