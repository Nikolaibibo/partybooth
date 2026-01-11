import { useState } from 'react';
import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onDelete?: (photo: Photo) => Promise<void>;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  onDelete,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: PhotoGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    if (!onDelete || deletingId) return;

    if (!confirm('Delete this photo? This cannot be undone.')) return;

    setDeletingId(photo.id);
    try {
      await onDelete(photo);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(photo.id)) {
      newSelection.delete(photo.id);
    } else {
      newSelection.add(photo.id);
    }
    onSelectionChange(newSelection);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group">
          <button
            onClick={() => onPhotoClick(photo)}
            className={`aspect-square rounded-xl overflow-hidden bg-theme-surface-medium
                       transition-transform duration-200 hover:scale-105 w-full
                       focus:outline-none focus:ring-4 focus:ring-theme-primary
                       ${selectedIds.has(photo.id) ? 'ring-4 ring-purple-500' : ''}`}
          >
            <img
              src={photo.thumbnailUrl || photo.imageUrl}
              alt={`Photo from ${photo.createdAt.toLocaleDateString()}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>

          {/* Selection checkbox */}
          {selectable && (
            <button
              onClick={(e) => handleSelect(e, photo)}
              className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2
                         flex items-center justify-center transition-colors
                         ${selectedIds.has(photo.id)
                           ? 'bg-purple-500 border-purple-500 text-white'
                           : 'bg-black/50 border-white/70 text-transparent hover:border-white'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={(e) => handleDelete(e, photo)}
              disabled={deletingId === photo.id}
              className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700
                         rounded-full text-white opacity-0 group-hover:opacity-100
                         transition-opacity disabled:opacity-50"
              title="Delete photo"
            >
              {deletingId === photo.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
