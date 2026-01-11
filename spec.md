# AI Photo Booth - Technical Specification

## Project Context

Web-based kiosk application for tablets at events (weddings, corporate events, parties). Users select a style, take a photo, and receive an AI-transformed image via QR code.

**Target**: MVP for tablet kiosk deployment  
**Stack**: React + Vite + Tailwind + Firebase + Black Forest Labs FLUX API

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│ Firebase Cloud   │────▶│ FLUX API        │
│  (Tablet Kiosk) │     │ Functions (Proxy)│     │ (BFL)           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Cloud Storage    │
                        │ (Final Images)   │
                        └──────────────────┘
```

---

## Core User Flow

```
[Style Selection] → [Countdown 5→1] → [Capture + Flash] → [Processing] → [Result + QR] → [Auto-Reset]
```

### Phase 1: Style Selection
- Display grid of style thumbnails
- Styles loaded from static JSON file (`/src/data/styles.json`)
- Single tap to select and proceed

### Phase 2: Photo Capture
- Front-facing camera via Browser Camera API
- Visual countdown: 5, 4, 3, 2, 1
- White flash overlay on capture
- Capture at native tablet resolution

### Phase 3: AI Processing
- Image sent to Firebase Cloud Function (proxy)
- Cloud Function forwards to FLUX API with credentials
- UI shows progress indicator (spinner/progress bar if API supports)
- On success: image stored in Cloud Storage with unique filename

### Phase 4: Result Display
- Show transformed image full-screen
- Generate QR code pointing to Cloud Storage URL
- Auto-reset to Phase 1 after configurable timeout (default: 15 seconds)

---

## Technical Requirements

### Frontend (React + Vite)

```
/src
├── components/
│   ├── StyleGallery.tsx      # Grid of style options
│   ├── CameraCapture.tsx     # Camera view + countdown + capture
│   ├── ProcessingView.tsx    # Loading state during AI transform
│   ├── ResultView.tsx        # Final image + QR code + timer
│   └── Toast.tsx             # Error/success notifications
├── hooks/
│   ├── useCamera.ts          # Camera API abstraction
│   └── useCountdown.ts       # Countdown timer logic
├── data/
│   └── styles.json           # Style definitions
├── services/
│   └── api.ts                # Firebase function calls
├── App.tsx                   # Main flow controller
└── main.tsx
```

**Key Dependencies:**
- `react` + `react-dom`
- `tailwindcss` (v3.x)
- `qrcode.react` (QR generation)
- `firebase` (client SDK)

**Responsive Design:**
- Support both landscape and portrait orientations
- CSS Grid/Flexbox for adaptive layouts
- Touch-optimized UI (large tap targets, no hover states)

### Backend (Firebase)

**Cloud Function: `transformImage`**
```typescript
// Input: { imageBase64: string, styleId: string }
// Output: { imageUrl: string } or { error: string }

// Flow:
// 1. Load style prompt from styles.json by styleId
// 2. POST to https://api.bfl.ai/v1/flux-2-pro with prompt + input_image
// 3. Poll polling_url until status === "Ready" (max 60s, 500ms interval)
// 4. Download result from result.sample (signed URL, expires in 10min)
// 5. Upload to Cloud Storage with unique filename
// 6. Return public Cloud Storage URL
```

- Receives base64 image + selected style ID
- Calls FLUX API with appropriate prompt/parameters for style
- Uploads result to Cloud Storage
- Returns public URL

**Cloud Storage Structure:**
```
/photos
  /{timestamp}_{randomId}.jpg
```

**Security Rules:**
- Cloud Storage: public read, no direct write (only via Cloud Functions)
- No Firestore needed for MVP

### FLUX.2 API Integration

**Model:** FLUX.2 [pro] (best balance of speed, quality, and cost)  
**Endpoint:** `POST https://api.bfl.ai/v1/flux-2-pro`  
**Pricing:** ~$0.03 per megapixel  
**Speed:** <10 seconds typical

**API Flow:**

```
1. POST /v1/flux-2-pro
   {
     "prompt": "<style prompt>",
     "input_image": "<base64 or URL>"
   }
   
2. Response: { "id": "task-id", "polling_url": "..." }

3. Poll GET /v1/get_result?id=<task-id>
   Status: "Pending" | "Ready" | "Error"
   
4. When "Ready": result.sample = signed URL (valid 10 min)
```

**Request Parameters:**

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `prompt` | string | Yes | Style transformation description |
| `input_image` | string | Yes | Base64 or URL, max 20MB/20MP |
| `seed` | integer | No | For reproducibility |
| `output_format` | string | No | "jpeg" (default) or "png" |
| `safety_tolerance` | integer | No | 0-5, default 2 |

**Resolution Handling:**
- Input: min 64x64, recommended up to 2MP, max 4MP
- Output: matches input dimensions (multiples of 16)
- Images >4MP auto-resized

**Error Handling:**
- Timeout: 60 seconds max
- Retry: 1 automatic retry on 5xx errors
- Signed URL expires after 10 minutes – download immediately
- User feedback: Toast notification with "Try Again" option

**Alternative Models:**
- FLUX.2 [max]: Higher quality, ~$0.07/MP, <15s – for premium events
- FLUX.2 [flex]: Adjustable steps/guidance, $0.06/MP – for fine control

---

## styles.json Schema

```json
{
  "styles": [
    {
      "id": "vintage",
      "name": "Vintage Film",
      "thumbnail": "/thumbnails/vintage.jpg",
      "prompt": "Transform this photo into a vintage 1970s film photograph with warm amber tones, natural film grain, and slightly faded highlights. Maintain the person's likeness and pose exactly.",
      "seed": null
    },
    {
      "id": "comic",
      "name": "Comic Book",
      "thumbnail": "/thumbnails/comic.jpg",
      "prompt": "Transform this photo into a bold comic book illustration with thick black outlines, cel-shaded coloring, halftone dot patterns, and dynamic contrast. Keep the person's features recognizable.",
      "seed": null
    },
    {
      "id": "renaissance",
      "name": "Renaissance Portrait",
      "thumbnail": "/thumbnails/renaissance.jpg",
      "prompt": "Transform this photo into a classical Renaissance oil painting portrait in the style of Rembrandt, with dramatic chiaroscuro lighting, rich earth tones, and visible brushwork texture. Preserve the subject's likeness.",
      "seed": null
    }
  ]
}
```

**Prompt Guidelines:**
- Always include "Transform this photo" to anchor the edit
- Explicitly state "maintain/preserve the person's likeness" for face consistency
- Be specific about visual characteristics (colors, textures, lighting)
- Keep prompts under 500 tokens for optimal results

---

## UI/UX Specifications

### Style Gallery
- 2x3 or 3x4 grid depending on orientation
- Style name below each thumbnail
- Selected state: border highlight

### Countdown
- Large centered numbers (min 200px font)
- Optional: audio beep per second
- Background: live camera preview

### Flash Effect
- Full-screen white overlay
- 150ms fade-in, 300ms fade-out

### Processing View
- Centered spinner or progress bar
- "Creating your image..." text
- No cancel option (simplicity)

### Result View
- Transformed image: 70% of screen height
- QR code: positioned below or beside image
- Countdown timer visible: "Starting over in X seconds..."
- Optional: "New Photo" button for immediate reset

### Toast Notifications
- Bottom-center positioning
- Auto-dismiss after 5 seconds
- Types: error (red), success (green), info (blue)

---

## Configuration

```typescript
// src/config.ts
export const CONFIG = {
  COUNTDOWN_SECONDS: 5,
  RESULT_DISPLAY_SECONDS: 15,
  API_TIMEOUT_MS: 60000,
  FLASH_DURATION_MS: 450,
};
```

---

## Error States

| Scenario | User Feedback | Recovery |
|----------|---------------|----------|
| Camera permission denied | Toast: "Please allow camera access" | Show retry button |
| Camera not available | Toast: "Camera not found" | Block flow |
| API timeout | Toast: "Processing took too long" | "Try Again" button |
| API error (4xx/5xx) | Toast: "Something went wrong" | "Try Again" button, auto-reset after 10s |
| Network offline | Toast: "No internet connection" | Block flow until online |

---

## Out of Scope (V1)

- ❌ Printing functionality
- ❌ Admin panel for style management
- ❌ Email sharing
- ❌ Offline mode
- ❌ User accounts / authentication
- ❌ Analytics dashboard

---

## Environment Variables

```bash
# Firebase (client-side, prefixed with VITE_)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=

# Cloud Function (server-side only, never exposed to client)
BFL_API_KEY=              # Black Forest Labs API key
```

---

## Development Workflow

1. **Setup:** `npm create vite@latest photo-booth -- --template react-ts`
2. **Install:** Tailwind, Firebase SDK, qrcode.react
3. **Local dev:** `npm run dev` (camera requires HTTPS or localhost)
4. **Deploy:** `firebase deploy --only hosting,functions`

---

## Testing Checklist

- [ ] Camera works on iPad Safari
- [ ] Camera works on Android Chrome
- [ ] Landscape orientation renders correctly
- [ ] Portrait orientation renders correctly
- [ ] Countdown completes and captures
- [ ] Flash effect visible
- [ ] API proxy returns transformed image
- [ ] QR code is scannable
- [ ] Auto-reset triggers after timeout
- [ ] Error toasts display correctly
- [ ] Touch targets are large enough (min 44x44px)

---

## File Deliverables

When implementation is complete, the project should contain:

```
/photo-booth
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── data/styles.json
│   ├── config.ts
│   ├── App.tsx
│   └── main.tsx
├── functions/
│   └── src/index.ts          # Cloud Function
├── public/
│   └── thumbnails/           # Style preview images
├── firebase.json
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── README.md
```
