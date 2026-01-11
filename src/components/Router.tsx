import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoothPage } from '../pages/BoothPage';
import { EventSelector } from './EventSelector';
import { GalleryPage } from '../gallery/GalleryPage';
import { AdminLogin } from '../admin/AdminLogin';
import { AdminLayout } from '../admin/AdminLayout';
import { EventList } from '../admin/EventList';
import { EventForm } from '../admin/EventForm';
import { EventDetail } from '../admin/EventDetail';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page - Event selector for kiosk operators */}
        <Route path="/" element={<EventSelector />} />

        {/* Booth mode - the main photo booth experience */}
        <Route path="/booth" element={<BoothPage />} />

        {/* Public gallery - anyone with event slug can view */}
        <Route path="/gallery/:eventSlug" element={<GalleryPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/events" element={<AdminLayout><EventList /></AdminLayout>} />
        <Route path="/admin/events/new" element={<AdminLayout><EventForm /></AdminLayout>} />
        <Route path="/admin/events/:eventId" element={<AdminLayout><EventDetail /></AdminLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
