import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingFallback } from './LoadingFallback';

// Critical path - keep eager (booth is the main experience)
import { BoothPage } from '../pages/BoothPage';
import { EventSelector } from './EventSelector';

// Lazy load separate user journeys
const GalleryPage = lazy(() => import('../gallery/GalleryPage').then(m => ({ default: m.GalleryPage })));
const AdminLogin = lazy(() => import('../admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('../admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const EventList = lazy(() => import('../admin/EventList').then(m => ({ default: m.EventList })));
const EventForm = lazy(() => import('../admin/EventForm').then(m => ({ default: m.EventForm })));
const EventDetail = lazy(() => import('../admin/EventDetail').then(m => ({ default: m.EventDetail })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page - Event selector for kiosk operators */}
        <Route path="/" element={<EventSelector />} />

        {/* Booth mode - the main photo booth experience */}
        <Route path="/booth" element={
          <ErrorBoundary>
            <BoothPage />
          </ErrorBoundary>
        } />

        {/* Public gallery - anyone with event slug can view */}
        <Route path="/gallery/:eventSlug" element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <GalleryPage />
            </Suspense>
          </ErrorBoundary>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminLogin />
          </Suspense>
        } />
        <Route path="/admin/events" element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><EventList /></AdminLayout>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/admin/events/new" element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><EventForm /></AdminLayout>
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/admin/events/:eventId" element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><EventDetail /></AdminLayout>
            </Suspense>
          </ErrorBoundary>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
