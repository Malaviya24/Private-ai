# Malaviya AI Dashboard

A professional Next.js dashboard that wraps the two existing API flows already present in this repository:

- 3D Logo Generator
- Text to Video

## What was added

- A fresh Next.js app using the App Router
- Server-side API routes at `app/api/logo/route.ts` and `app/api/video/route.ts`
- A polished dashboard UI in `components/dashboard.tsx`
- Centralized environment-based configuration in `lib/api-config.ts`

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

## Notes

- Your original Flask API folders are untouched and still available as reference.
- The Next.js app keeps external API calls on the server so tokens are not exposed in the browser.
- The text-to-video route keeps the same flow as your Python version: NSFW check, job creation, then polling.
