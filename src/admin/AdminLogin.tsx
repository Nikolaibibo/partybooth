import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyAdmin } from '../services/admin';
import { useAdminScroll } from '../hooks/useAdminScroll';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Enable scrolling for admin pages (override kiosk CSS)
  useAdminScroll();

  // Check if already logged in - redirect in effect, not during render
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      navigate('/admin/events');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = await verifyAdmin(password);
      localStorage.setItem('adminToken', token);
      navigate('/admin/events');
    } catch (err) {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white font-poppins">Admin Login</h1>
          <p className="text-gray-400 mt-2 font-inter">
            Enter the admin password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700
                         text-white rounded-xl focus:outline-none focus:ring-2
                         focus:ring-purple-500 font-inter"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-400 text-center font-inter">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700
                       disabled:bg-gray-700 disabled:cursor-not-allowed
                       text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-gray-500 hover:text-gray-400 text-sm font-inter"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
