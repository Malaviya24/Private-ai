# Malaviya AI Dashboard

A professional Next.js dashboard that wraps the two existing API flows already present in this repository:

- 3D Logo Generator
- Text to Video

## What was added

- A fresh Next.js app using the App Router
- Server-side API routes at `app/api/logo/route.ts` and `app/api/video/route.ts`
- A polished dashboard UI in `components/dashboard.tsx`
- Centralized environment-based configuration in `lib/api-config.ts`
- A Render deployment blueprint in `render.yaml`

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and replace the placeholder values if needed.

3. Start the dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Connect the GitHub repo and select this repository.
4. Render will read `render.yaml` automatically.
5. Fill in the secret env vars before the first deploy:

```bash
LOGO_API_URL
TEXT_TO_VIDEO_BASE_URL
TEXT_TO_VIDEO_AUTHORIZATION
TEXT_TO_VIDEO_SIGN
```

6. Optional env vars already have defaults in the blueprint, but you can override them if needed:

```bash
TEXT_TO_VIDEO_DEVICE_ID
TEXT_TO_VIDEO_VERSION
TEXT_TO_VIDEO_PT
```

## Notes

- Your original Flask API folders are untouched and still available as reference.
- The Next.js app keeps external API calls on the server so tokens are not exposed in the browser.
- The text-to-video route keeps the same flow as your Python version: NSFW check, job creation, then polling.
- Render is the safer deployment target here because the video route can stay open longer than a typical serverless function.
