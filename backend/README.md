# PocketPilot Backend (Local)

This backend is split from the frontend and runs fully local.

## Stack
- Firebase Authentication (Emulator)
- Firebase Firestore (Emulator)
- Firebase Cloud Functions (Node 20, TypeScript)
- Qdrant (Docker, local vector DB)

## Data model in Firestore
All user data is user-scoped under:
- `users/{uid}/transactions/{docId}`
- `users/{uid}/budgets/{docId}`
- `users/{uid}/goals/{docId}`
- `users/{uid}/categories/{docId}`
- `users/{uid}/settings/{docId}`

Security rules only allow access when `request.auth.uid == {uid}`.

## Qdrant user isolation
Vector payloads always include `userId`. Queries enforce a filter on `userId` so users can only retrieve their own vectors.

## Local setup
1. Start Qdrant:
   - `docker compose -f backend/infra/docker-compose.yml up -d`
2. Start Ollama and pull lightweight models:
   - `ollama serve`
   - `ollama pull llama3.2:3b`
   - `ollama pull nomic-embed-text:v1.5`
3. Install function dependencies:
   - `cd backend/functions && npm install`
4. Install Firebase CLI if needed:
   - `npm install -g firebase-tools`
5. Start Firebase emulators from backend/firebase:
   - `cd backend/firebase && OLLAMA_BASE_URL=http://127.0.0.1:11434 OLLAMA_CHAT_MODEL=llama3.2:3b OLLAMA_EMBED_MODEL=nomic-embed-text:v1.5 firebase emulators:start`

Emulator ports:
- UI: `http://127.0.0.1:4000`
- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Functions: `127.0.0.1:5001`

## Functions
- `syncRagIndex` (requires Firebase ID token, syncs user-scoped RAG docs into Qdrant)
- `health`
- `upsertVector` (requires Firebase ID token)
- `queryVectors` (requires Firebase ID token)
- `ragChat` (requires Firebase ID token, uses Ollama + hybrid Qdrant retrieval + deterministic transaction logic)

Deploying is intentionally omitted because you asked for local-only infrastructure.

## Dockerized full stack
From repo root you can run web + Firebase emulators/functions + Qdrant + Ollama together:

1. `npm run docker:up`
2. `npm run docker:ps`
3. Open:
   - Web: `http://127.0.0.1:5173`
   - Emulator UI: `http://127.0.0.1:4000`

Stop everything:
- `npm run docker:down`

Tail logs:
- `npm run docker:logs`
