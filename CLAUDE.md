# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PartyBooth is an AI photo booth web app for tablet kiosks at events. Users select a style, take a selfie, and receive an AI-transformed image via QR code. Photos are organized by event with a public gallery for guests.

**Tech Stack:** React + Vite + TypeScript + Tailwind CSS + Firebase (Hosting, Functions, Firestore, Storage) + Black Forest Labs FLUX Kontext Pro API

## Commands

### Frontend Development
```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally
npm run lint         # ESLint
```

### Cloud Functions (from /functions directory)
```bash
npm run build        # Compile TypeScript
npm run serve        # Build + start Firebase emulator
npm run deploy       # Deploy functions only
npm run logs         # View function logs
```

### Firebase Deployment
```bash
firebase deploy                    # Deploy everything
firebase deploy --only hosting     # Frontend only
firebase deploy --only functions   # Functions only
firebase deploy --only firestore   # Rules + indexes
```

### Emulator Usage
```bash
firebase emulators:start           # Start all emulators
```
Set `VITE_USE_EMULATOR=true` in `.env.local` to connect frontend to local emulators.

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | EventSelector | Landing page - select event for kiosk |
| `/booth?event={id}` | BoothPage | Photo booth experience |
| `/gallery/:eventSlug` | GalleryPage | Public photo gallery |
| `/admin` | AdminLogin | Admin login (password auth) |
| `/admin/events` | EventList | Manage events |
| `/admin/events/new` | EventForm | Create new event |
| `/admin/events/:id` | EventDetail | Event details + photos |

## Architecture

### Booth Flow (State Machine)
The booth uses a reducer-based state machine in `src/pages/BoothPage.tsx`:
```
style-selection → countdown → capturing → processing → result → (reset)
```

### Key Data Flow
1. **EventSelector** or direct URL - Selects event, redirects to `/booth?event={id}`
2. **StyleGallery** - User selects style from `src/data/styles.json`
3. **CameraCapture** - Countdown → capture via `useCamera` hook → base64 image
4. **ProcessingView** - Shows while waiting for API
5. **transformImage Cloud Function**:
   - Validates event exists and is active
   - Submits to FLUX Kontext Pro API with style prompt
   - Polls the returned `polling_url` until ready
   - Generates thumbnail (400x400) using Sharp
   - Stores both in Cloud Storage under `photos/{eventId}/`
   - Creates photo document in Firestore
6. **ResultView** - Displays image + QR code, auto-resets after 15 seconds

### Firestore Collections

**events**
```typescript
{
  id: string;
  name: string;           // "Wedding 2025"
  slug: string;           // URL-friendly: "wedding-2025"
  date: Timestamp;
  createdAt: Timestamp;
  isActive: boolean;
}
```

**photos**
```typescript
{
  id: string;
  eventId: string;
  styleId: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: Timestamp;
  storagePath: string;
}
```

### Cloud Functions

| Function | Purpose |
|----------|---------|
| `transformImage` | Process photo with FLUX API, store with thumbnail (rate limited) |
| `verifyAdmin` | Validate admin password, return JWT token (rate limited) |
| `createEvent` | Create new event (requires admin token) |
| `updateEvent` | Update event properties (requires admin token) |
| `deleteEvent` | Delete event and cascade delete all photos + storage files |
| `deletePhoto` | Delete single photo and storage files |
| `deletePhotos` | Bulk delete up to 100 photos |

### Rate Limiting

Distributed rate limiting via Firestore (`rateLimits` collection):
- `verifyAdmin`: 5 requests / 5 minutes per IP
- `transformImage`: 30 requests / minute per event+IP
- Admin operations: 30 requests / minute per token

### Storage Structure
```
photos/{eventId}/{timestamp}_{uuid}.jpg           # Full-size image
photos/{eventId}/thumbs/{timestamp}_{uuid}_thumb.jpg  # 400x400 thumbnail
```

### i18n
Language is determined by URL parameter (`?lang=de` or `?lang=en`, defaults to English).
- Translations: `src/i18n/translations.ts`
- Hook: `src/hooks/useTranslation.ts`
- No UI language switcher - URL-driven only

## Firebase Configuration

- **Project:** partybooth-f8991547
- **Hosting URL:** https://partybooth.web.app
- **Region:** europe-west1 (functions)
- **Firestore:** Events, photos, and rate limits
- **Storage:** Public read, functions-only write

### Secrets
```bash
firebase functions:secrets:set BFL_API_KEY        # FLUX API key
firebase functions:secrets:set ADMIN_PASSWORD     # Admin login password
firebase functions:secrets:set JWT_SECRET         # JWT signing secret
```

### Environment Variables (.env.local)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
VITE_USE_EMULATOR=true  # Optional: connect to local emulators
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/components/Router.tsx` | App routing with lazy loading |
| `src/components/ErrorBoundary.tsx` | React error boundary |
| `src/pages/BoothPage.tsx` | Main photo booth logic |
| `src/gallery/GalleryPage.tsx` | Public gallery with pagination |
| `src/admin/*.tsx` | Admin interface components |
| `src/services/events.ts` | Event Firestore queries |
| `src/services/gallery.ts` | Photo queries with cursor pagination |
| `src/services/admin.ts` | Admin API calls |
| `functions/src/index.ts` | Cloud functions |
| `functions/src/utils/auth.ts` | JWT token generation/validation |
| `functions/src/utils/rateLimit.ts` | Distributed rate limiting |
| `functions/src/utils/validation.ts` | Input validation helpers |
| `functions/src/utils/storage.ts` | Storage file deletion |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Composite indexes |

## Style Definitions

Styles are defined in two places (keep in sync):
- `src/data/styles.json` - Client-side metadata (id, gradient, color)
- `functions/src/index.ts` - Server-side prompts (security: not exposed to client)

**Current styles:** comic, pop-art, vintage, cyberpunk, sketch, sparkle, disco, neon, polaroid, pixel

Adding a new style requires:
1. Add entry to `styles.json`
2. Add prompt to `STYLE_PROMPTS` in cloud function
3. Add translation keys to `src/i18n/translations.ts` (both `en` and `de`)
4. Add mapping to `src/data/styleNames.ts`
5. Generate thumbnail: `BFL_API_KEY=xxx node scripts/generate-thumbnails.js scripts/source.jpg <style-id>`

## Code Architecture

### Code Splitting
Admin and gallery routes are lazy-loaded via `React.lazy()` to reduce initial bundle size. Critical booth flow is eagerly loaded.

### Error Boundaries
`ErrorBoundary` component wraps route groups to catch render errors with retry capability.

### Security
- JWT tokens for admin authentication (24h expiry)
- Timing-safe password comparison
- Image validation (format + 9MB size limit)
- Security headers (X-Frame-Options, CSP basics via firebase.json)
