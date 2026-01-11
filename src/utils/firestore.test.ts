import { describe, it, expect } from 'vitest';
import { convertTimestamp, eventFromFirestore, photoFromFirestore } from './firestore';
import { Timestamp } from 'firebase/firestore';

describe('convertTimestamp', () => {
  it('returns current date for undefined input', () => {
    const before = new Date();
    const result = convertTimestamp(undefined);
    const after = new Date();

    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('returns same Date object for Date input', () => {
    const date = new Date('2024-06-15T10:30:00Z');
    const result = convertTimestamp(date);

    expect(result).toBe(date);
  });

  it('converts Firestore Timestamp to Date', () => {
    const timestamp = Timestamp.fromDate(new Date('2024-06-15T10:30:00Z'));
    const result = convertTimestamp(timestamp);

    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2024-06-15T10:30:00.000Z');
  });
});

describe('eventFromFirestore', () => {
  const validEventData = {
    name: 'Test Event',
    slug: 'test-event',
    date: Timestamp.fromDate(new Date('2024-12-25')),
    createdAt: Timestamp.fromDate(new Date('2024-01-01')),
    isActive: true,
    theme: 'elegant',
  };

  it('converts valid Firestore data to Event object', () => {
    const result = eventFromFirestore('event-123', validEventData);

    expect(result).toEqual({
      id: 'event-123',
      name: 'Test Event',
      slug: 'test-event',
      date: expect.any(Date),
      createdAt: expect.any(Date),
      isActive: true,
      theme: 'elegant',
    });
  });

  it('uses default theme when not provided', () => {
    const dataWithoutTheme = { ...validEventData, theme: undefined };
    const result = eventFromFirestore('event-123', dataWithoutTheme);

    expect(result.theme).toBe('default');
  });

  it('throws error when required field is missing', () => {
    const invalidData = { ...validEventData, name: undefined };

    expect(() => eventFromFirestore('event-123', invalidData)).toThrow(
      "Invalid event document: missing required field 'name'"
    );
  });

  it('throws error when slug is missing', () => {
    const invalidData = { ...validEventData, slug: null };

    expect(() => eventFromFirestore('event-123', invalidData)).toThrow(
      "Invalid event document: missing required field 'slug'"
    );
  });
});

describe('photoFromFirestore', () => {
  const validPhotoData = {
    eventId: 'event-123',
    styleId: 'comic',
    imageUrl: 'https://storage.example.com/photo.jpg',
    thumbnailUrl: 'https://storage.example.com/photo_thumb.jpg',
    createdAt: Timestamp.fromDate(new Date('2024-06-15')),
    storagePath: 'photos/event-123/photo.jpg',
  };

  it('converts valid Firestore data to Photo object', () => {
    const result = photoFromFirestore('photo-456', validPhotoData);

    expect(result).toEqual({
      id: 'photo-456',
      eventId: 'event-123',
      styleId: 'comic',
      imageUrl: 'https://storage.example.com/photo.jpg',
      thumbnailUrl: 'https://storage.example.com/photo_thumb.jpg',
      createdAt: expect.any(Date),
      storagePath: 'photos/event-123/photo.jpg',
    });
  });

  it('uses imageUrl as thumbnailUrl fallback', () => {
    const dataWithoutThumb = { ...validPhotoData, thumbnailUrl: undefined };
    const result = photoFromFirestore('photo-456', dataWithoutThumb);

    expect(result.thumbnailUrl).toBe(validPhotoData.imageUrl);
  });

  it('throws error when eventId is missing', () => {
    const invalidData = { ...validPhotoData, eventId: undefined };

    expect(() => photoFromFirestore('photo-456', invalidData)).toThrow(
      "Invalid photo document: missing required field 'eventId'"
    );
  });

  it('throws error when imageUrl is missing', () => {
    const invalidData = { ...validPhotoData, imageUrl: null };

    expect(() => photoFromFirestore('photo-456', invalidData)).toThrow(
      "Invalid photo document: missing required field 'imageUrl'"
    );
  });
});
