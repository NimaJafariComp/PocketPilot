# PocketPilot Monorepo

## Getting Started
Recommended path is Docker-first.

Prerequisites:
- Docker Desktop
- Node.js 20+ and npm (only for running convenience scripts like `npm run docker:up`)

First run:
1. Clone and enter repo:
   - `git clone <your-repo-url>`
   - `cd PocketPilot`
2. Start full stack:
   - `npm run docker:up`
3. Verify services:
   - `npm run docker:ps`
4. Open:
   - Web app: `http://127.0.0.1:5173`
   - Firebase Emulator UI: `http://127.0.0.1:4000`

Useful:
- Stream logs: `npm run docker:logs`
- Stop all: `npm run docker:down`
- Rebuild after Dockerfile/dependency changes: `npm run docker:up -- --build`

## Structure
- `apps/web` Vite + React web app
- `apps/mobile` Expo React Native app (optional)
- `backend` Firebase emulators/functions + Qdrant infra
- `packages/core` shared domain models and pure business logic
- `packages/services` platform-agnostic service interfaces and platform implementations

## Web app
1. `cd apps/web`
2. `npm install`
3. `npm run dev`

Or from root:
- `npm run web:dev`

## Mobile app
Run the Expo React Native app against the local backend/emulator stack.

1. Start the local backend first:
   - `npm run docker:up`
2. Install mobile dependencies:
   - `cd apps/mobile`
   - `npm install`
3. Create a local Expo env file:
   - `cp apps/mobile/.env.example apps/mobile/.env`
4. Start Expo:
   - From `apps/mobile`: `npm run start`
   - Or from repo root: `npm run mobile:start`
5. Open the app:
   - Press `i` for the iOS simulator
   - Press `a` for the Android emulator
   - Or scan the QR code with Expo Go on a physical device

Native run commands are also available:
- `cd apps/mobile && npm run ios`
- `cd apps/mobile && npm run android`

Notes:
- If you run on a physical device, replace `127.0.0.1` in `apps/mobile/.env` with your Mac's LAN IP address.
- The mobile app reads these values from `apps/mobile/app.config.ts`.

## Backend (local)
See `backend/README.md`.

## Docker (full stack)
Run everything (web + Firebase emulators/functions + Qdrant + Ollama):

1. `npm run docker:up`
2. `npm run docker:ps`
3. Open:
   - Web: `http://127.0.0.1:5173`
   - Firebase UI: `http://127.0.0.1:4000`

Useful commands:
- `npm run docker:logs`
- `npm run docker:down`

Notes:
- The stack uses a local demo Firebase project ID: `demo-pocketpilot`.
- Chat uses `qwen2.5:1.5b` locally and embeddings use `nomic-embed-text:v1.5`.
- `ollama-init` pulls `qwen2.5:1.5b` and `nomic-embed-text:v1.5` on first boot; first startup can take longer.
