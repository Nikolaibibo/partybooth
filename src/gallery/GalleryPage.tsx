import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getEventBySlug } from '../services/events';
import { getGalleryPhotos } from '../services/gallery';
import { PhotoGrid } from './PhotoGrid';
import { PhotoModal } from './PhotoModal';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import type { Event, Photo } from '../types';

export function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    async function loadGallery() {
      if (!eventSlug) {
        if (isMounted) {
          setError('No event specified');
          setLoading(false);
        }
        return;
      }

      try {
        const eventData = await getEventBySlug(eventSlug);

        // Check if still mounted before updating state
        if (!isMounted) return;

        if (!eventData) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        setEvent(eventData);

        const photosData = await getGalleryPhotos(eventData.id);

        // Check again before final state update
        if (!isMounted) return;

        setPhotos(photosData);
      } catch (err) {
        console.error('Error loading gallery:', err);
        if (isMounted) {
          setError('Failed to load gallery');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadGallery();

    return () => {
      isMounted = false;
    };
  }, [eventSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-surface-dark flex items-center justify-center">
        <div className="text-theme-text-primary text-xl font-theme-body">{t('loadingGallery')}</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-theme-surface-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl font-theme-body mb-4">{error}</div>
          <a
            href="/"
            className="text-theme-primary hover:opacity-80 font-theme-body"
          >
            {t('backToHome')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider themeId={event.theme}>
      <div className="min-h-screen bg-theme-surface-dark">
        {/* Header */}
        <header className="bg-theme-surface-medium border-b border-white/10 px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-theme-text-primary font-theme-heading">
              {event.name}
            </h1>
            <p className="text-theme-text-muted font-theme-body mt-2">
              {event.date.toLocaleDateString()} • {photos.length} {t('photos')}
            </p>
          </div>
        </header>

        {/* Photo Grid */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {photos.length === 0 ? (
            <div className="text-center text-theme-text-muted text-xl font-theme-body mt-12">
              {t('noPhotosYet')}
            </div>
          ) : (
            <PhotoGrid photos={photos} onPhotoClick={setSelectedPhoto} />
          )}
        </main>

        {/* Photo Modal */}
        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
