import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { photoFromFirestore } from '../utils/firestore';
import type { Photo } from '../types';

const PHOTOS_COLLECTION = 'photos';
const PAGE_SIZE = 50;

export interface PaginatedPhotos {
  photos: Photo[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function getGalleryPhotos(
  eventId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedPhotos> {
  let q = query(
    collection(db, PHOTOS_COLLECTION),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE + 1) // Fetch one extra to check if there's more
  );

  if (cursor) {
    q = query(
      collection(db, PHOTOS_COLLECTION),
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(PAGE_SIZE + 1)
    );
  }

  const querySnapshot = await getDocs(q);
  const docs = querySnapshot.docs;
  const hasMore = docs.length > PAGE_SIZE;
  const photoDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

  return {
    photos: photoDocs.map((doc) => photoFromFirestore(doc.id, doc.data())),
    lastDoc: photoDocs.length > 0 ? photoDocs[photoDocs.length - 1] : null,
    hasMore,
  };
}

export async function getPhotoCount(eventId: string): Promise<number> {
  const q = query(
    collection(db, PHOTOS_COLLECTION),
    where('eventId', '==', eventId)
  );

  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

export async function getPhotoCounts(
  eventIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Fetch counts in parallel
  await Promise.all(
    eventIds.map(async (eventId) => {
      counts[eventId] = await getPhotoCount(eventId);
    })
  );

  return counts;
}
