# Malaviya AI Dashboard

A Next.js App Router workspace for server-backed tools:

- 3D Logo Generator
- Text to Image
- Text to Video
- Web to ZIP
- Mobile Lookup

## What was added

- Server-side API routes at `app/api/logo/route.ts`, `app/api/image/route.ts`, `app/api/video/route.ts`, `app/api/web-to-zip/route.ts`, and `app/api/lookup/route.ts`
- A dashboard UI in `components/dashboard.tsx`
- A dedicated mobile lookup client component in `components/mobile-lookup.tsx`
- A dedicated web-to-zip client component in `components/web-to-zip.tsx`
- Centralized environment-based configuration in `lib/api-config.ts`
- Shared typed response models in `lib/types.ts`
- A Render deployment blueprint in `render.yaml`

## Mobile lookup feature

The mobile lookup flow keeps the provider key on the server and includes:

- 10-digit validation before request
- Loading spinner and `Searching...` state
- Styled result cards for all returned fields
- Empty-state and provider error handling
- Copy buttons for full results and each match card
- Last 5 searches stored in `localStorage`

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the required secrets.

3. Start the dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Required environment variables

```bash
LOGO_API_URL
TEXT_TO_IMAGE_API_URL
TEXT_TO_VIDEO_BASE_URL
TEXT_TO_VIDEO_AUTHORIZATION
TEXT_TO_VIDEO_SIGN
LOOKUP_API_KEY
```

## Optional environment variables

```bash
TEXT_TO_VIDEO_DEVICE_ID
TEXT_TO_VIDEO_VERSION
TEXT_TO_VIDEO_PT
LOOKUP_API_URL
WEB_TO_ZIP_API_URL
```

## Notes

- External API secrets stay on the server through Next.js route handlers.
- The lookup route expects a 10-digit number and proxies the external lookup service with `GET /api/lookup?number=...`.
- `WEB_TO_ZIP_API_URL` should point to your deployed `WEB-TO-ZIP` Python service `/zip` endpoint.
- The Next.js route `GET /api/web-to-zip?url=...` calls that Python service, reads `download_url` from JSON, and streams the ZIP back to the browser.
- Your original Flask API folders are untouched and still available as reference.
