# ◈ AnshAPI TeraStream

> Stream any TeraBox video instantly in HD — powered by AnshAPI

## Stack
- **Backend**: Node.js + Express (API proxy)
- **Frontend**: React + Vite + TypeScript

## Quick Start

### 1. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Start the backend (Terminal 1)
```bash
cd backend
node server.js
# Runs on http://localhost:3001
```

### 3. Start the frontend (Terminal 2)
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 4. Open your browser
Visit `http://localhost:5173`, paste any TeraBox link and stream instantly!

## Features
- 🎬 Custom HD video player with full controls
- 📊 Quality switcher (360p / 480p / 720p)
- ⬇️ Direct MP4 + ZIP download links
- 🌊 Beautiful video background (light-waves)
- 📱 Mobile responsive

## API
Uses AnshAPI: `https://ansh-apis.is-dev.org/api/teraboxapi`
