import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEventById } from '../services/events';
import { updateEvent, deleteEvent, deletePhoto, deletePhotos } from '../services/admin';
import { getGalleryPhotos } from '../services/gallery';
import { PhotoGrid } from '../gallery/PhotoGrid';
import type { Event, Photo } from '../types';

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;

      try {
        const eventData = await getEventById(eventId);
        if (!eventData) {
          navigate('/admin/events');
          return;
        }
        setEvent(eventData);

        const photosResult = await getGalleryPhotos(eventId);
        setPhotos(photosResult.photos);
      } catch (err) {
        console.error('Error loading event:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId, navigate]);

  const handleToggleActive = async () => {
    if (!event || !eventId) return;
    setUpdating(true);
    setError(null);

    try {
      await updateEvent(eventId, { isActive: !event.isActive });
      setEvent({ ...event, isActive: !event.isActive });
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update event status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    const photoCount = photos.length;
    const message = photoCount > 0
      ? `Delete this event and all ${photoCount} photos? This cannot be undone.`
      : 'Delete this event? This cannot be undone.';

    if (!confirm(message)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteEvent(eventId);
      navigate('/admin/events');
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event. Please try again.');
      setDeleting(false);
    }
  };

  const handleDeletePhoto = useCallback(async (photo: Photo) => {
    try {
      await deletePhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo. Please try again.');
      throw err;
    }
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} photo(s)? This cannot be undone.`)) return;

    setBulkDeleting(true);
    setError(null);

    try {
      const result = await deletePhotos(Array.from(selectedIds));
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setSelectMode(false);

      if (result.failed > 0) {
        setError(`Deleted ${result.deleted} photos. ${result.failed} failed.`);
      }
    } catch (err) {
      console.error('Error bulk deleting photos:', err);
      setError('Failed to delete photos. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    if (selectMode) {
      setSelectedIds(new Set());
    }
  };

  const selectAll = () => {
    setSelectedIds(new Set(photos.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const downloadAllPhotos = async () => {
    if (!event || photos.length === 0) return;

    setDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folder = zip.folder(event.slug || 'photos');

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const response = await fetch(photo.imageUrl);
          const blob = await response.blob();
          const filename = `${photo.createdAt.toISOString().slice(0, 10)}_${photo.styleId}_${i + 1}.jpg`;
          folder?.file(filename, blob);
        } catch (err) {
          console.warn(`Failed to download photo ${photo.id}:`, err);
        }
        setDownloadProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.slug || 'photos'}_${event.date.toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error creating zip:', err);
      setError('Failed to download photos. Please try again.');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-12">Loading event...</div>
    );
  }

  if (!event) {
    return (
      <div className="text-center text-gray-400 py-12">Event not found</div>
    );
  }

  const boothUrl = `${window.location.origin}/booth?event=${eventId}`;
  const galleryUrl = `${window.location.origin}/gallery/${event.slug}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            to="/admin/events"
            className="text-gray-400 hover:text-white text-sm font-inter mb-2 inline-block"
          >
            ← Back to events
          </Link>
          <h2 className="text-2xl font-bold text-white font-poppins">
            {event.name}
          </h2>
          <p className="text-gray-400 font-inter mt-1">
            {event.date.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleActive}
            disabled={updating || deleting}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
              event.isActive
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {updating ? 'Updating...' : event.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || updating}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                       text-white font-semibold rounded-xl transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-red-400 font-inter">{error}</p>
        </div>
      )}

      {/* Links */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white font-poppins mb-2">
            Booth URL
          </h3>
          <p className="text-gray-400 text-sm font-inter mb-3">
            Use this URL on your kiosk tablet
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={boothUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700
                         text-gray-300 rounded-lg text-sm font-mono"
            />
            <button
              onClick={() => navigator.clipboard.writeText(boothUrl)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700
                         text-white rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white font-poppins mb-2">
            Gallery URL
          </h3>
          <p className="text-gray-400 text-sm font-inter mb-3">
            Share this link for guests to view photos
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={galleryUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700
                         text-gray-300 rounded-lg text-sm font-mono"
            />
            <button
              onClick={() => navigator.clipboard.writeText(galleryUrl)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700
                         text-white rounded-lg transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white font-poppins">
            Photos ({photos.length})
          </h3>
          {photos.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Download button */}
              <button
                onClick={downloadAllPhotos}
                disabled={downloading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50
                           text-white font-semibold rounded-xl transition-colors text-sm
                           flex items-center gap-2"
              >
                {downloading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {downloadProgress}%
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download All
                  </>
                )}
              </button>

              {selectMode && (
                <>
                  <span className="text-gray-400 text-sm">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                  >
                    Select all
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.size === 0 || bulkDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50
                               text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                  </button>
                </>
              )}
              <button
                onClick={toggleSelectMode}
                className={`px-4 py-2 font-semibold rounded-xl transition-colors text-sm
                           ${selectMode
                             ? 'bg-gray-600 hover:bg-gray-500 text-white'
                             : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          )}
        </div>
        {photos.length === 0 ? (
          <div className="text-center text-gray-400 py-12 bg-gray-800 rounded-xl">
            No photos yet. Start the photo booth to capture some!
          </div>
        ) : (
          <PhotoGrid
            photos={photos}
            onPhotoClick={(photo) => window.open(photo.imageUrl, '_blank')}
            onDelete={handleDeletePhoto}
            selectable={selectMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>
    </div>
  );
}
