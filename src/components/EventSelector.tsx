import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveEvents } from '../services/events';
import { useTranslation } from '../hooks/useTranslation';
import type { Event } from '../types';

export function EventSelector() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    async function loadEvents() {
      try {
        const activeEvents = await getActiveEvents();
        setEvents(activeEvents);
      } catch (err) {
        setError('Failed to load events');
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const handleSelectEvent = (event: Event) => {
    navigate(`/booth?event=${event.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-white text-xl font-inter">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex flex-col">
      {/* Header */}
      <header className="px-8 py-10 lg:py-12 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 font-poppins">
          {t('selectEvent')}
        </h1>
        <p className="text-lg md:text-xl text-white/90 font-inter">
          {t('selectEventDescription')}
        </p>
      </header>

      {/* Event Grid */}
      <div className="flex-1 px-4 md:px-6 pb-8 overflow-auto">
        {error && (
          <div className="text-center text-white bg-red-500/20 rounded-xl p-4 mb-6 max-w-md mx-auto">
            {error}
          </div>
        )}

        {events.length === 0 && !error && (
          <div className="text-center text-white/80 text-xl font-inter mt-12">
            {t('noActiveEvents')}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleSelectEvent(event)}
              className="group bg-white/10 backdrop-blur-sm rounded-3xl p-6
                         text-left transition-all duration-200
                         active:scale-95 hover:bg-white/20
                         touch-manipulation focus:outline-none focus:ring-4 focus:ring-white/50"
            >
              <h3 className="text-2xl font-bold text-white font-poppins mb-2">
                {event.name}
              </h3>
              <p className="text-white/70 font-inter">
                {event.date.toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Admin Link */}
      <div className="p-4 text-center">
        <button
          onClick={() => navigate('/admin')}
          className="text-white/50 hover:text-white/80 text-sm font-inter transition-colors"
        >
          Admin
        </button>
      </div>
    </div>
  );
}
