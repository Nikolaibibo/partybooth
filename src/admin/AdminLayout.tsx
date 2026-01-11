import { useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAdminScroll } from '../hooks/useAdminScroll';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Enable scrolling for admin pages (override kiosk CSS)
  useAdminScroll();

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-white font-poppins">
              PartyBooth Admin
            </h1>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/admin/events"
                className={`px-3 py-2 rounded-lg font-inter transition-colors ${
                  isActive('/admin/events')
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Events
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-gray-400 hover:text-white text-sm font-inter"
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm font-inter"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
