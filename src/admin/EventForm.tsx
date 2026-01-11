import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../services/admin';
import { THEME_OPTIONS, type ThemeId } from '../data/themes';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function EventForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [theme, setTheme] = useState<ThemeId>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const eventId = await createEvent({
        name,
        slug,
        date: new Date(date),
        isActive: true,
        theme,
      });
      navigate(`/admin/events/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white font-poppins mb-8">
        Create New Event
      </h2>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <label className="block text-gray-400 font-inter mb-2">
            Event Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Sarah & Tom's Wedding"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700
                       text-white rounded-xl focus:outline-none focus:ring-2
                       focus:ring-purple-500 font-inter"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 font-inter mb-2">
            URL Slug
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 font-inter mr-2">/gallery/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="sarah-toms-wedding"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700
                         text-white rounded-xl focus:outline-none focus:ring-2
                         focus:ring-purple-500 font-inter"
              required
            />
          </div>
          <p className="text-gray-500 text-sm mt-1 font-inter">
            This will be the public link for the gallery
          </p>
        </div>

        <div>
          <label className="block text-gray-400 font-inter mb-2">
            Event Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700
                       text-white rounded-xl focus:outline-none focus:ring-2
                       focus:ring-purple-500 font-inter"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 font-inter mb-2">
            Visual Theme
          </label>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  theme === t.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Theme preview gradient */}
                <div
                  className="h-8 rounded-lg mb-2"
                  style={{
                    background: `linear-gradient(to right, ${t.colors.bgGradientFrom}, ${t.colors.bgGradientVia}, ${t.colors.bgGradientTo})`,
                  }}
                />
                <div className="text-white font-semibold font-inter">{t.name}</div>
                <div className="text-gray-500 text-sm font-inter">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-400 font-inter">{error}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !name || !slug || !date}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700
                       disabled:bg-gray-700 disabled:cursor-not-allowed
                       text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600
                       text-white font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
