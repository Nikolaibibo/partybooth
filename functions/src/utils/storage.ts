import * as admin from 'firebase-admin';

export async function deletePhotoFiles(storagePath: string | undefined): Promise<void> {
  if (!storagePath) return;

  const bucket = admin.storage().bucket();

  const thumbPath = storagePath
    .replace(/\/([^/]+)$/, '/thumbs/$1')
    .replace('.jpg', '_thumb.jpg');

  await Promise.all([
    bucket.file(storagePath).delete().catch(err => {
      console.warn('Failed to delete main image:', err.message);
    }),
    bucket.file(thumbPath).delete().catch(err => {
      console.warn('Failed to delete thumbnail:', err.message);
    }),
  ]);
}
