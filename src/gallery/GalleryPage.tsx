import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getEventBySlug } from '../services/events';
import { getGalleryPhotos, getPhotoCount } from '../services/gallery';
import { PhotoGrid } from './PhotoGrid';
import { PhotoModal } from './PhotoModal';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import type { Event, Photo } from '../types';

export function GalleryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
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

        if (!isMounted) return;

        if (!eventData) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        setEvent(eventData);

        const [photosResult, count] = await Promise.all([
          getGalleryPhotos(eventData.id),
          getPhotoCount(eventData.id),
        ]);

        if (!isMounted) return;

        setPhotos(photosResult.photos);
        setCursor(photosResult.lastDoc);
        setHasMore(photosResult.hasMore);
        setTotalCount(count);
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

  const loadMore = useCallback(async () => {
    if (!event || !cursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await getGalleryPhotos(event.id, cursor);
      setPhotos((prev) => [...prev, ...result.photos]);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading more photos:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [event, cursor, loadingMore]);

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
      <div className="h-screen overflow-y-auto bg-theme-surface-dark">
        {/* Header */}
        <header className="bg-theme-surface-medium border-b border-white/10 px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-theme-text-primary font-theme-heading">
              {event.name}
            </h1>
            <p className="text-theme-text-muted font-theme-body mt-2">
              {event.date.toLocaleDateString()} • {totalCount} {t('photos')}
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
            <>
              <PhotoGrid photos={photos} onPhotoClick={setSelectedPhoto} />

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-theme-primary hover:opacity-90 disabled:opacity-50
                               text-white font-semibold rounded-xl transition-opacity
                               min-h-[48px] touch-manipulation"
                  >
                    {loadingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('loadingGallery')}
                      </span>
                    ) : (
                      `${t('loadMore')} (${photos.length}/${totalCount})`
                    )}
                  </button>
                </div>
              )}
            </>
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
