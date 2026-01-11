import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllEvents } from '../services/admin';
import { getPhotoCounts } from '../services/gallery';
import type { Event } from '../types';

export function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        setError(null);
        const allEvents = await getAllEvents();
        setEvents(allEvents);

        // Fetch photo counts for all events
        if (allEvents.length > 0) {
          const counts = await getPhotoCounts(allEvents.map((e) => e.id));
          setPhotoCounts(counts);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-12">Loading events...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700
                     text-white font-semibold rounded-xl transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white font-poppins">Events</h2>
        <Link
          to="/admin/events/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700
                     text-white font-semibold rounded-xl transition-colors"
        >
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No events yet. Create your first event!
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-6 py-4 text-gray-400 font-medium font-inter">
                  Name
                </th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium font-inter">
                  Date
                </th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium font-inter">
                  Photos
                </th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium font-inter">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium font-inter">
                  Gallery Link
                </th>
                <th className="text-right px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-gray-700 last:border-0">
                  <td className="px-6 py-4 text-white font-inter">
                    {event.name}
                  </td>
                  <td className="px-6 py-4 text-gray-400 font-inter">
                    {event.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-300 font-inter">
                    {photoCounts[event.id] ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {event.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/gallery/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm font-inter"
                    >
                      /gallery/{event.slug}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/events/${event.id}`}
                      className="text-purple-400 hover:text-purple-300 font-inter"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
