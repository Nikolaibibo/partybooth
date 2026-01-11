import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import { photoFromFirestore } from '../utils/firestore';
import type { Photo } from '../types';

const PHOTOS_COLLECTION = 'photos';

export async function getGalleryPhotos(
  eventId: string,
  limitCount: number = 100
): Promise<Photo[]> {
  const q = query(
    collection(db, PHOTOS_COLLECTION),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) =>
    photoFromFirestore(doc.id, doc.data())
  );
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
