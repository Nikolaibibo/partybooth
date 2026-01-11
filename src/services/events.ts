import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { eventFromFirestore } from '../utils/firestore';
import type { Event } from '../types';

const EVENTS_COLLECTION = 'events';

export async function getEventById(eventId: string): Promise<Event | null> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return eventFromFirestore(docSnap.id, docSnap.data());
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where('slug', '==', slug)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return eventFromFirestore(doc.id, doc.data());
}

export async function getActiveEvents(): Promise<Event[]> {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where('isActive', '==', true),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) =>
    eventFromFirestore(doc.id, doc.data())
  );
}
