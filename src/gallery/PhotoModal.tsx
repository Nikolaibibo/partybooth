import { useEffect } from 'react';
import type { Photo } from '../types';

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
}

export function PhotoModal({ photo, onClose }: PhotoModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white
                   w-12 h-12 flex items-center justify-center rounded-full
                   bg-white/10 hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
      <div
        className="max-w-4xl max-h-[90vh] animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.imageUrl}
          alt="Photo"
          className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
        />

        {/* Download button */}
        <div className="mt-4 flex justify-center">
          <a
            href={photo.imageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover
                       text-white font-semibold rounded-xl
                       transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
