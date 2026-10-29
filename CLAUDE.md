# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions

always use edit/update tool for files, so that we can rewind command in cli to rewind stuff, incase it get bad, instead of editing using shell command

when ever you are told to implement any features, always ask questions and interview me relentlessly using askquestionstool, until you have the topic or features completey clear, no doubts

do not do any commit and push to prod, until U are told to do

## Role & Core Directives

You are an expert AI engineer and documentation maintainer for this codebase. You treat documentation as executable code. You must never make significant code changes without simultaneously updating the project's living documentation map.

Whenever you analyze, refactor, build, or fix components in this project, you must actively update the following files to ensure zero loss of context:

### 1. Decisions.md (The "Why")

**Goal:** Document the reasoning behind architectural and technical choices.

- **Rule:** Never just log _what_ you did. You must log _why_ you did it.
- **Format:** When a new dependency is added, a pattern is chosen, or a significant refactor occurs, append a record including:
  - Context & Problem Statement
  - Considered Options (What else did we think about?)
  - Chosen Solution
  - **The "Why":** The decisive factor (e.g., performance, time-to-market, constraint).

### 2. Flow.md (The Execution Trace)

**Goal:** Map how data and execution move across the system.

- **Rule:** When introducing or modifying core logic, trace the execution path across file boundaries.
- **Format:** Map the flow sequentially.
  - E.g., `User Input -> [api/route.ts] -> validationMiddleware -> [services/auth.ts:login()] -> [db/queries.ts] -> Response`.
- Include side effects, background jobs, and state mutations so a developer knows exactly where a payload travels.

### 3. Bug.md / Feature.md (The Trail)

**Goal:** Maintain a start-to-finish audit trail that anyone can pick up cold.

- **Rule:** Before starting a bug fix or feature, outline the goal. As you work, log the trail.
- **Format:**
  - **Context:** What is broken / What is being built.
  - **Investigation/Steps:** What files were checked, what assumptions were tested, and what failed.
  - **Blockers:** Any roadblocks hit during implementation.
  - **Resolution:** The exact PR/Commit or set of file changes that resolved the issue, and how it was verified.

### 4. Architecture.md (The System Map)

**Goal:** Provide a holistic view of the system so nothing is touched blind.

- **Rule:** Before proposing major structural changes, read this file. If you create a new module, service, or database table, you must add it to the system map.
- **Format:** Maintain a high-level overview of tech stack components, folder structures, strict boundaries (e.g., "Frontend never talks to DB directly"), and core domain models.

### Execution Trigger

At the end of your response, after completing a coding task, confirm which of these 4 files you have updated or specify if an update is not required for the current scope.

## Overview

Real-time collaborative whiteboard. Three independently run services, no root package/workspace:

- `frontend/` — React 19 + Vite, Tailwind v4, shadcn/ui (JS/JSX only, no TypeScript). Deployed on Vercel (`vercel.json` SPA rewrite) at `https://lienwand.vercel.app`.
- `backend/` — Express 5 + Socket.io + Mongoose, ES modules. JWT auth, Cloudinary for image/thumbnail storage.
- `pythonServer/` — FastAPI + Keras CNN that classifies a hand-drawn stroke as circle/square/triangle/line.

Product/technical specs live in `Docs/` (PRD.md, TRD.md, ProjectDetails.md, TODO.md, explain.md).

## Commands

Package manager is pnpm. There are no tests anywhere in the repo.

```bash
# backend (needs backend/.env — see backend/.env.example: MONGO_URL, JWT_SECRET, PORT, CLIENT_URL, SERVER_URL, CLOUDINARY_*, SMTP_*, GOOGLE_*/GITHUB_* OAuth creds)
cd backend && pnpm install && pnpm dev      # nodemon app.js, port 5000

# frontend (env: VITE_API_URL, VITE_ML_API_URL; defaults to localhost:5000 / 127.0.0.1:8000)
cd frontend && pnpm install && pnpm dev     # vite, port 5173
cd frontend && pnpm lint                    # eslint
cd frontend && pnpm build

# ML server (optional FRONTEND_URL env for CORS)
cd pythonServer && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
cd pythonServer && python train.py          # retrain; needs QuickDraw .ndjson files in pythonServer/dataset/
```

## Architecture

### Data model

A board (`backend/models/Whiteboard.js`) stores its whole content as one embedded `strokes` array. Every drawn element — pen stroke, shape, image, text — is a "stroke" distinguished by `tool` (`pen|shape|image|text`) with tool-specific fields (`points`, `shapeType`, `imageUrl`, `text`, `x/y/width/height`…). Adding a new element type means updating this schema's enums/fields as well as the frontend renderer. Sharing uses a 6-char `shareCode`, `sharedWith[{userId, role}]` and `pendingRequests`; approved requests are granted the `editor` role.

### Persistence vs. realtime are separate paths

- **Persistence is REST only.** `WhiteboardPage.handleStrokesChange` debounces (1s, `useWhiteboard.debouncedSave`) a `PUT /api/whiteboards/:id` with the _full_ strokes array, then uploads a canvas-rendered JPEG thumbnail to `POST /:id/thumbnail` (→ Cloudinary). Images are uploaded via `POST /:id/upload-image` (multer memory storage → Cloudinary) and stored as URLs.
- **Socket.io is a stateless relay** (`backend/socket/socketHandler.js`). It keeps in-memory presence per board (`boardUsers`) and handles `join-board`, `leave-board`, `stroke-update`, `stroke-progress`, `stroke-cancel`, `stroke-erase`, `board-sync`, `cursor-move` (sent `volatile`), emitting `presence-update` / `cursor-leave`. It never writes to MongoDB.
- Sockets are authenticated by an `io.use` middleware that verifies `handshake.auth.token` (JWT) and sets `socket.data.userId`. `join-board` checks board access in the DB and takes the username from `User`, not the client. All stroke events are dropped (`canEdit`) for sockets that haven't joined or are `viewer`s.
- What `WhiteboardPage.handleStrokesChange` emits depends on how the array changed: more strokes → `stroke-update` (the newest stroke); fewer → `stroke-erase` (`{ ids }`); same length (move/resize/snap) → `board-sync` (full array). Undo/redo also send `board-sync` and save via `persistStrokes`.
- While a stroke is still being drawn, `stroke-progress` (`{ stroke, from, points }`) streams batches of points. `from > 0` appends; `from = 0` replaces the whole stroke (used for shapes and snaps). `stroke-cancel` (`{ id }`) discards an unfinished stroke. Receivers keep these in `liveStrokes` until the finished `stroke-update` arrives.

### Frontend structure

- `api/client.js` `apiFetch` wraps `fetch`, reads the JWT from `localStorage` and adds `Authorization: Bearer`. Per-resource clients are in `api/*.api.js`.
- Global state is React context (`context/`: Auth, Socket, Theme, Toast; context objects themselves are declared in `AllContexts.jsx`), consumed via hooks in `hooks/`.
- Canvas logic lives in hooks, not components: `useCanvas` (drawing, erasing, hold-to-snap shape recognition), `useCamera` (pan/zoom, limits in `utils/constants.js` `ZOOM`), `useHistory` (undo/redo as snapshots of the full strokes array), `useBoardSocket` (initial board load + socket listeners). `useCanvas` uses `utils/spatialIndex.js` (a uniform-grid index) to look up strokes by area for hit-testing.
- High-frequency socket state (remote cursors, `liveStrokes`) lives in `utils/frameStore.js` stores rather than React state. They notify subscribers at most once per animation frame and are read with `useSyncExternalStore`, so bursts of events don't re-render the whole page.
- `@/` aliases `frontend/src`.

### Shape recognition flow

Holding still at the end of a stroke (`useCanvas` hold timer) calls `utils/shapeRecognizer.recognizeShape` → `POST {VITE_ML_API_URL}/api/recognize` with `{points}`. The server resamples/normalizes (`preprocess.py`) and returns a class if confidence > 60%; the frontend then replaces the stroke with clean geometry from `utils/shapeGeometry.js`. `CATEGORIES` in `main.py` must match the class order used in `train.py`.

### Backend conventions

- Controllers are wrapped in `utils/catchAsync`; throw `ApiError` (with `isOperational`) for client-facing errors — non-operational errors are masked as 500 unless `NODE_ENV=development`.
- Validation uses express-validator chains in `middleware/validationMiddleware.js`, ending with `validate`.
- `protect` middleware puts the decoded JWT (`{ id }`) on `req.user`.
- Business logic that is shared or touches external services lives in `services/` (email, OAuth, password hashing, JWT, uploads, share codes, notifications).
- **Auth flows** (`controllers/authController.js`):
  - Email/password login.
  - OAuth (Google/GitHub, `services/oauthService.js`): the `GET /api/auth/:provider` → `/:provider/callback` round trip uses a `state` cookie, then redirects to `CLIENT/oauth/callback#token=<jwt>`. OAuth users have no password (`password` is required only when there's no `googleId`/`githubId`).
  - Password reset: `POST /forgot-password` stores the sha256 of a random token with a 15-minute expiry and emails `CLIENT/reset-password?token=…` via nodemailer/SMTP. It always responds the same way, so emails can't be enumerated. `POST /reset-password` matches the hash and the expiry, then clears both fields.
- **Notifications** (`models/Notification.js`, `/api/notifications`): created by `whiteboardController` for access requests and responses. Users act on them via `POST /:id/action`.
- CORS is hand-rolled in `app.js` and in `config/socket.js`, both driven by `ALLOWED_ORIGINS` in `utils/constants.js`, which is parsed from the comma-separated `CLIENT_URL` env (default `http://localhost:5173`). Its first entry is also the OAuth redirect target. The Python server reads a comma-separated `FRONTEND_URL` the same way.
