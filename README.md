# PocketPilot Monorepo

## Getting Started
Recommended path is Docker-first.

Prerequisites:
- Docker Desktop
- Node.js 20+ and npm

First run:
1. Clone and enter repo:
   - `git clone <your-repo-url>`
   - `cd PocketPilot`
2. Install workspace dependencies once from the repo root:
   - `npm install`
3. Start full stack (web + mobile):
   - `npm run docker:up`
4. Verify services:
   - `npm run docker:ps`
5. Open:
   - Web app: `http://127.0.0.1:5173`
   - Expo dev tools: `http://127.0.0.1:19002`
   - Firebase Emulator UI: `http://127.0.0.1:4000`
   - Categorization service: `http://127.0.0.1:8088/health`
   - RAG service: `http://127.0.0.1:8089/health`

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
Install dependencies from the repo root first:
- `npm install`

Then either:
- `cd apps/web && npm run dev`
- `npm run web:dev`

Avoid running `npm install` inside `apps/web`; this repo uses the root npm workspace lockfile as the source of truth.

## Mobile app
Run the Expo React Native app against the local backend/emulator stack.

1. Start the local backend first:
   - `npm run docker:up`
2. Install workspace dependencies from the repo root:
   - `npm install`
3. Create a local Expo env file:
   - `cp apps/mobile/.env.example apps/mobile/.env`
4. Start Expo:
   - From `apps/mobile`: `npm run start`
   - Or from repo root: `npm run mobile:start`
   - Or use `npm run docker:up` to start the entire stack including mobile in Docker
5. Open the app:
   - Press `i` for the iOS simulator
   - Press `a` for the Android emulator
   - Or scan the QR code with Expo Go on a physical device

Native run commands are also available:
- `cd apps/mobile && npm run ios`
- `cd apps/mobile && npm run android`

Notes:
- Do not run `npm install` inside `apps/mobile`; mobile startup assumes the repo was installed from the root workspace.
- If you run on a physical device, replace `127.0.0.1` in `apps/mobile/.env` with your Mac's LAN IP address.
- The mobile app reads these values from `apps/mobile/app.config.ts`.
- The mobile app can now target Rust AI services directly with `EXPO_PUBLIC_CATEGORIZATION_SERVICE_URL` and `EXPO_PUBLIC_RAG_SERVICE_URL`.
- If `npm run start` fails with a NativeWind/Tailwind version error, rerun `npm install` from the repo root so the mobile workspace gets its intended local `tailwindcss@3`.

## Backend (local)
See `backend/README.md`.

## Docker (full stack)
Run everything (web + Firebase emulators/functions + Rust AI services + Qdrant + Ollama):

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
- The web app now calls Rust categorization and RAG services by default in local Docker mode.
- For non-emulator Rust service deployments, set `GOOGLE_APPLICATION_CREDENTIALS` so the
  services can authenticate to Firestore.
- `ollama-init` pulls `qwen2.5:1.5b` and `nomic-embed-text:v1.5` on first boot; first startup can take longer.
