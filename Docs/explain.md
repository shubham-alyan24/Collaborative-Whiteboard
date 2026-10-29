# Lienwand — The Complete Project Explainer (Interview Prep)

> This document assumes you know **nothing**. It starts from "what is this app" and goes all the way down to the math, the network messages, and the performance tricks. Every claim points to the real file in this repo so you can open it and check.
>
> Suggested reading order: §1–§3 (the big picture) → §4–§6 (architecture & data) → §7 (every flow, step by step) → §8–§10 (the hard parts: canvas, camera, ML) → §11 (optimizations — the part interviewers love) → §12–§14 (security, deployment, limitations) → §15 (practice Q&A).

---

## Table of Contents

1. [What is this project? (the pitch)](#1-what-is-this-project-the-pitch)
2. [Objectives — what problem it solves](#2-objectives--what-problem-it-solves)
3. [Tech stack — what we used and *why*](#3-tech-stack--what-we-used-and-why)
4. [High-level architecture](#4-high-level-architecture)
5. [Folder structure — where things live](#5-folder-structure--where-things-live)
6. [Data model (MongoDB)](#6-data-model-mongodb)
7. [Every flow, step by step](#7-every-flow-step-by-step)
8. [The canvas engine (how drawing actually works)](#8-the-canvas-engine-how-drawing-actually-works)
9. [The camera — pan & zoom math](#9-the-camera--pan--zoom-math)
10. [The ML shape-recognition service](#10-the-ml-shape-recognition-service)
11. [Optimizations — what, why, and how](#11-optimizations--what-why-and-how)
12. [Security](#12-security)
13. [Deployment, environments & CI/CD](#13-deployment-environments--cicd)
14. [Methodologies & design patterns used](#14-methodologies--design-patterns-used)
15. [Known limitations & what I'd improve next](#15-known-limitations--what-id-improve-next)
16. [Interview Q&A bank](#16-interview-qa-bank)
17. [Glossary](#17-glossary)

---

## 1. What is this project? (the pitch)

**Lienwand** is a **real-time collaborative whiteboard** — think a lightweight Miro / Excalidraw. Several people open the same board in their browsers and draw on it together; everyone sees everyone else's strokes and mouse cursors live. It has an **infinite canvas** (pan and zoom forever), pen / shapes / text / images / eraser / select-move-resize tools, undo/redo, PNG export, sharing via a 6-character code with an owner-approval flow, notifications, Google/GitHub login, and an **AI feature**: if you draw a wobbly circle and *hold the pen still for 1 second*, a neural network recognizes it and snaps it into a perfect circle (also squares, triangles, lines).

### 30-second version (say this in the interview)

> "It's a real-time collaborative whiteboard. React frontend draws on an HTML5 canvas; a Node/Express backend handles auth and stores boards in MongoDB; Socket.io relays drawing events between users in the same board 'room' so collaboration is live. There's also a separate Python FastAPI microservice running a small 1-D CNN I trained on Google's QuickDraw dataset, which turns hand-drawn shapes into clean geometry. A big part of the work was performance — two-layer canvas, a spatial index so we only draw and hit-test what's on screen, frame-batched rendering, and sending only deltas over the socket."

### 2-minute version

Add: *three independently deployed services* (frontend on Vercel, Node backend on Azure Web Apps via GitHub Actions, Python ML server), *JWT auth* (+ OAuth), *Cloudinary* for images/thumbnails, *REST for persistence vs. WebSockets for realtime* (deliberately separate paths), and the *owner-approval sharing model*. Then pick one optimization and go deep (the spatial index or the two-canvas split are the best stories).

---

## 2. Objectives — what problem it solves

From `Docs/PRD.md` and what's actually built:

| Objective | How it's met |
|---|---|
| Multiple people draw together **in real time** | Socket.io rooms per board; strokes stream point-by-point while being drawn |
| Feel like a natural drawing tool | Canvas 2D rendering, pressure-free smooth polylines, touch + pen + mouse via Pointer Events, pinch-zoom |
| Infinite space | Camera transform (pan/zoom) — the "world" has no edges |
| Work is **saved** automatically | Debounced auto-save to MongoDB via REST |
| Controlled sharing | Share code → "request to edit" → owner approves → editor role |
| AI assistance | Hold-to-snap shape recognition via a CNN microservice |
| Fast on big boards | Viewport culling with a spatial index, layered canvases, frame batching |
| Easy sign-in | Email/password + Google + GitHub OAuth, password reset by email |

**Target users** (from PRD): remote teams brainstorming, teachers/students, designers sketching, PMs running workshops.

---

## 3. Tech stack — what we used and *why*

### Frontend (`frontend/`)

| Tech | What it is | Why we chose it | Alternative you could mention |
|---|---|---|---|
| **React 19** | UI library: you describe UI as components; React updates the DOM when state changes | Component model, huge ecosystem, hooks make logic reusable | Vue, Svelte |
| **Vite 7** | Dev server + bundler | Instant dev startup (native ES modules), fast HMR, Rollup production builds, easy code-splitting | Webpack, CRA (deprecated) |
| **HTML5 Canvas 2D** | A bitmap you draw on with JS (`ctx.lineTo`, `ctx.stroke`) | Drawing thousands of strokes as DOM/SVG nodes would be slow; canvas is one element regardless of content | SVG (easier hit-testing, slow at scale), WebGL (faster, much more complex) |
| **Tailwind CSS v4** | Utility-first CSS (`className="flex gap-2"`) | Fast styling, no naming CSS classes, tiny output (unused classes purged) | CSS modules, styled-components |
| **shadcn/ui + Radix** | Copy-paste accessible components built on Radix primitives | Accessible dialogs/menus without a heavy component library | MUI, Chakra |
| **React Router 7** | Client-side routing (`/home`, `/whiteboard/:id`) | Standard; supports lazy routes | TanStack Router |
| **socket.io-client** | WebSocket client with reconnection, rooms, fallbacks | Pairs with Socket.io server | native WebSocket |
| **react-hook-form** | Forms with minimal re-renders | Login/settings forms | Formik |
| **framer-motion** | Animations | Landing page polish | CSS animations |
| **JavaScript (no TypeScript)** | — | Decided explicitly in `Docs/TODO.md` ("change to TypeScript — no need") | TypeScript |

### Backend (`backend/`)

| Tech | Why |
|---|---|
| **Node.js + Express 5** | JS on both ends (one language), non-blocking I/O suits many concurrent socket connections; Express 5 natively forwards rejected promises to error handlers |
| **Socket.io 4** | WebSockets + automatic reconnection + **rooms** (perfect for "one room per board") + fallback to long-polling if WebSockets are blocked |
| **MongoDB + Mongoose 9** | Document DB: a board with an embedded array of strokes maps naturally to one JSON document; strokes have varying fields per tool (schema flexibility). Mongoose adds schemas, validation, `populate` |
| **JWT (`jsonwebtoken`)** | Stateless auth — server doesn't store sessions; the same token authenticates both REST calls and the socket handshake |
| **bcryptjs** | Slow, salted password hashing |
| **express-validator** | Declarative request validation chains |
| **multer** | Parses `multipart/form-data` (file uploads) |
| **Cloudinary** | Image CDN/storage — keeps big binary data *out* of MongoDB |
| **nodemailer** | Sends password-reset emails over SMTP |
| **ES Modules** (`"type": "module"`) | Modern `import/export` syntax |

### ML service (`pythonServer/`)

| Tech | Why |
|---|---|
| **Python + FastAPI** | Python is where ML lives; FastAPI is async, fast, auto-validates request bodies with **Pydantic**, auto-generates docs at `/docs` |
| **TensorFlow / Keras** (`tensorflow-cpu`) | Train & serve the CNN; CPU build is smaller and enough for a tiny model |
| **NumPy** | Vectorized preprocessing (resampling, normalization) |
| **Uvicorn** | ASGI server that runs FastAPI |
| **Google QuickDraw dataset** | Millions of real human doodles labeled by category — free, realistic training data |

### Why a *separate* Python service instead of doing ML in Node?
1. The ML ecosystem (TensorFlow, NumPy) is Python-first.
2. **Isolation**: a slow/crashed model never takes down auth or saving. The frontend treats ML failure as "unknown shape" and just keeps the normal pen stroke (`frontend/src/utils/shapeRecognizer.js`).
3. **Independent scaling**: inference is CPU-heavy; you can scale it separately from the I/O-bound Node server.

### Infra / tooling
- **pnpm** package manager (fast, disk-efficient via a content-addressed store).
- **Vercel** hosts the frontend (static SPA + `vercel.json` rewrite so every URL serves `index.html`).
- **Azure Web App** hosts the Node backend, deployed by **GitHub Actions** (`.github/workflows/main_lienwand-node.yml`) on every push to `main`.
- **ESLint** for linting. **nodemon** for auto-restart in dev.
- **No automated tests** exist in the repo (be honest about this if asked; see §15).

---

## 4. High-level architecture

```
                         ┌──────────────────────────────────────────────┐
                         │                 BROWSER (React SPA)          │
                         │  Vercel: https://lienwand.vercel.app         │
                         │                                              │
                         │  Pages ─ Components ─ Hooks ─ Canvas engine  │
                         └───────┬──────────────┬───────────────┬───────┘
              REST (HTTPS, JSON) │   WebSocket  │               │ REST (JSON)
              Authorization:     │   (Socket.io)│               │ POST /api/recognize
              Bearer <JWT>       │   auth.token │               │ {points}
                                 ▼              ▼               ▼
                    ┌─────────────────────────────────┐   ┌──────────────────────┐
                    │   NODE BACKEND (Express 5 +     │   │  PYTHON ML SERVER    │
                    │   Socket.io)  — Azure Web App   │   │  FastAPI + Keras CNN │
                    │                                 │   │  (stateless)         │
                    │  routes → middleware →          │   └──────────────────────┘
                    │  controllers → services → models│
                    │                                 │
                    │  socketHandler: stateless RELAY │
                    │  + in-memory presence           │
                    └───────┬──────────────┬──────────┘
                            │              │
                 Mongoose   ▼              ▼  upload_stream
                    ┌──────────────┐  ┌──────────────┐   ┌──────────────┐
                    │   MongoDB    │  │  Cloudinary  │   │ SMTP (email) │
                    │ users,boards,│  │ images +     │   │ reset links  │
                    │ notifications│  │ thumbnails   │   └──────────────┘
                    └──────────────┘  └──────────────┘
                                         ▲
                    Google / GitHub OAuth┘ (redirect flow via backend)
```

### The single most important architectural idea: **two separate paths**

| | **Persistence path** | **Realtime path** |
|---|---|---|
| Transport | HTTP REST | WebSocket (Socket.io) |
| Purpose | Make the board *durable* | Make collaboration *feel instant* |
| When | Debounced, 1 s after you stop changing things | Immediately, every animation frame |
| Payload | The **full** strokes array | Small deltas (new points, one stroke, erased ids) |
| Touches DB? | Yes (`PUT /api/whiteboards/:id`) | **Never** — the socket server is a pure relay |

**Why split them?** If every pen movement wrote to MongoDB, you'd do hundreds of DB writes per second per user. Instead the socket layer just forwards messages between browsers (cheap, in-memory), and the database only gets one write after the user pauses. The trade-off: if a user closes the tab within that 1-second window, the last change can be lost (see §15).

---

## 5. Folder structure — where things live

```
Whiteboard/
├── backend/
│   ├── app.js                  # entry: Express app, CORS, routes, Socket.io, error handlers, DB connect
│   ├── config/                 # db.js (Mongo connect), socket.js (CORS for sockets), cloudinary.js
│   ├── routes/                 # URL → [middleware..., controller]  (auth, whiteboard, notification)
│   ├── middleware/             # protect (JWT), validation chains, multer upload, error handler
│   ├── controllers/            # request handlers (business logic per endpoint)
│   ├── services/               # reusable logic: token, password, oauth, email, upload, shareCode, notification
│   ├── models/                 # Mongoose schemas: User, Whiteboard (with embedded strokes), Notification
│   ├── socket/socketHandler.js # all realtime events + presence
│   └── utils/                  # ApiError, catchAsync, constants (ALLOWED_ORIGINS, COLORS, ROLES)
│
├── frontend/src/
│   ├── main.jsx                # React root; wraps app in Theme → Auth → Socket → ErrorBoundary → Toast providers
│   ├── Router.jsx              # routes, lazy-loaded pages, ProtectedRoute
│   ├── api/                    # client.js (fetch wrapper adding JWT) + auth/whiteboard/notification APIs
│   ├── context/                # global state via React Context (Auth, Socket, Theme, Toast)
│   ├── hooks/                  # ⭐ the brains: useCanvas, useCamera, useHistory, useBoardSocket, useWhiteboard...
│   ├── components/whiteboard/  # Canvas.jsx, Toolbar, BoardHeader (export/share), SharePanel, Minimap
│   ├── pages/                  # LandingPage, Login, Home, WhiteboardPage, JoinBoard, AccountSettings, ...
│   └── utils/                  # shapeGeometry, shapeRecognizer, spatialIndex, frameStore, storage, constants
│
├── pythonServer/
│   ├── main.py                 # FastAPI app: loads model once, POST /api/recognize
│   ├── preprocess.py           # resample to 64 points + normalize (shared by training & serving!)
│   ├── train.py                # loads QuickDraw, augments, builds + trains CNN, saves shape_model.keras
│   └── shape_model.keras       # the trained model
│
└── Docs/                       # PRD, TRD, ProjectDetails, TODO, and this file
```

**Rule of thumb in the frontend:** components are thin; logic lives in **custom hooks**. `Canvas.jsx` mostly wires pointer events to `useCanvas`, which does the actual work.

---

## 6. Data model (MongoDB)

### 6.1 `User` — `backend/models/User.js`
```
name, email (unique, lowercased)
password            → bcrypt hash, select:false (never returned unless asked), required only if no googleId/githubId
passwordResetToken  → sha256 of the emailed token, select:false
passwordResetExpires
googleId, githubId  → unique + sparse (many users can have "no googleId")
profilePicture      → default DiceBear avatar seeded by name
ownedBoards[], sharedBoards[]  → refs to Whiteboard
virtual "notifications" (not stored; resolved via populate)
```
**`sparse: true` explained:** a normal unique index treats "missing" as a value, so only *one* user could lack a `googleId`. Sparse indexes skip documents without the field.

### 6.2 `Whiteboard` — `backend/models/Whiteboard.js`
```
name, owner (ref User), thumbnail (Cloudinary URL)
shareCode         → 6 chars, unique
sharedWith[]      → { userId, role: "viewer" | "editor" }
pendingRequests[] → { userId }   (each gets its own _id, used as requestId)
strokes[]         → EMBEDDED array of strokeSchema (_id:false)
```

### 6.3 The "everything is a stroke" design
Every element on the board is a **stroke** object distinguished by `tool`:

| `tool` | Fields used | Example |
|---|---|---|
| `pen` | `points: [[x,y],...]`, `color`, `size` | freehand line |
| `shape` | `points`, `color`, `size`, `shapeType` (rectangle/square/circle/triangle/diamond/line/arrow/star) | a dragged rectangle — **stored as points**, rendered as a polyline just like pen |
| `image` | `imageUrl`, `x`, `y`, `width`, `height` | uploaded picture |
| `text` | `text`, `x`, `y`, `fontSize`, `color` | typed label |

Every stroke also has `id` (a client-generated `crypto.randomUUID()`) and `createdAt`.

**Why client-generated UUIDs?** The client needs an id the instant the user starts drawing (to stream the in-progress stroke to others and later erase it by id) — waiting for a server round-trip would add latency. UUID v4 collisions are practically impossible.

**Why embedded instead of a separate `strokes` collection?** Loading a board is one query returning one document — fast and simple. Trade-off: MongoDB documents are capped at **16 MB**, and every save rewrites the whole array (see §15).

**Why shapes are stored as points:** one renderer (`renderStroke`) handles pen and shapes; hit-testing, erasing, moving and resizing all work on points uniformly. Adding a new element type means touching this schema's enum *and* the frontend renderer.

### 6.4 `Notification` — `backend/models/Notification.js`
```
recipient, sender, board, type (request_received | request_approved | request_denied | added_to_board)
message, isRead, actionData { requestId, role }
indexes: { recipient:1, createdAt:-1 }  and  { recipient:1, isRead:1 }
```
The two **compound indexes** exactly match the two hot queries: "my latest notifications" and "how many unread do I have".

---

## 7. Every flow, step by step

### 7.1 Email/password register & login
1. `Login.jsx` → `authApi.register/login` → `apiFetch` (`frontend/src/api/client.js`).
2. Route `POST /api/auth/register` runs `registerValidation` (express-validator: name non-empty, valid email, password ≥ 6) then `register` controller.
3. Controller checks email uniqueness, hashes password with **bcrypt cost 12** (`services/passwordService.js`), creates user, signs a **JWT** `{ id }` valid 7 days (`services/tokenService.js`).
4. Response `{ token, user }`. Frontend `AuthContext.login` stores both in **localStorage** (`utils/storage.js`) and in React state.
5. From now on, `apiFetch` reads the token from localStorage and adds `Authorization: Bearer <token>` to every request.
6. Login: same but `findOne(...).select("+password")` (password is hidden by default) and `bcrypt.compare`. Note the **generic error** "Invalid email or password" for both wrong email and wrong password (doesn't reveal which emails exist).

### 7.2 Protected requests
`protect` middleware (`backend/middleware/authMiddleware.js`) reads the Bearer header → `jwt.verify` → puts `{ id }` on `req.user`. On the frontend, `ProtectedRoute` simply redirects to `/login` if there's no user in context.

### 7.3 Google / GitHub OAuth (Authorization Code flow)
```
Browser               Backend                         Google/GitHub
  │ click "Google" ──► GET /api/auth/google
  │                    make random `state`, set httpOnly cookie
  │ ◄── 302 redirect to provider (client_id, redirect_uri, scope, state)
  │ ───────────────────────────────────────────────► user consents
  │ ◄────────── 302 to /api/auth/google/callback?code=..&state=..
  │                    compare state with cookie (CSRF check)
  │                    POST code + client_secret → access_token   ──►
  │                    GET userinfo (+ /user/emails for GitHub)    ──►
  │                    require VERIFIED email
  │                    find user by googleId, else by email (link), else create
  │ ◄── 302 to <frontend>/oauth/callback#token=<JWT>
  │ OAuthCallback.jsx reads token from the URL #fragment, wipes it from history,
  │ calls /auth/me, logs in, navigates to /home
```
Files: `backend/services/oauthService.js`, `backend/controllers/authController.js` (`oauthStart`, `oauthCallback`), `frontend/src/pages/OAuthCallback.jsx`.

Key points to say:
- **`state` parameter** prevents login-CSRF (an attacker can't complete a flow they didn't start in your browser).
- **Token in the URL fragment (`#`)**, not the query string — fragments are never sent to servers, so the JWT doesn't land in server/proxy logs. Then `history.replaceState` removes it from the address bar.
- **Only verified emails** are trusted for account linking — otherwise someone could create a GitHub account with *your* unverified email and take over your Lienwand account.
- The `client_secret` stays on the server; the browser only ever sees the one-time `code`.

### 7.4 Forgot / reset password
1. `POST /forgot-password {email}` → generate 32 random bytes (64 hex chars), store **only its SHA-256 hash** + expiry (15 min), email the raw token in a link.
2. Always respond "If that email exists, a reset link has been sent" → **no account enumeration**.
3. `POST /reset-password {token, password}` → hash the incoming token, find a user with that hash and `expires > now`, set new bcrypt password, clear the token (single use).

Why hash the reset token? If the DB leaks, attackers still can't use the stored values to reset passwords (same reason we hash passwords). SHA-256 (fast) is fine here because the token is high-entropy random, unlike human passwords which need slow bcrypt.

### 7.5 Home page (board list)
`GET /api/whiteboards` → boards where `owner = me` OR `sharedWith.userId = me`, `populate` owner names, `.select(...)` only card fields (**not** the heavy `strokes` array), sorted by `updatedAt`. Search/date filter/sort happen **client-side** in a `useMemo` (`pages/Home.jsx`) — the list is small, so no extra requests.

### 7.6 Create a board
`POST /api/whiteboards` → `generateUniqueShareCode()` (random 6 chars, retry until unused) → create doc → `$push` id into `user.ownedBoards` → frontend navigates to `/whiteboard/:id`.

### 7.7 Open a board (the whiteboard page)
`WhiteboardPage.jsx` composes hooks:
```
useWhiteboard(id)      → strokes state, tool/color/size state, debouncedSave, saveThumbnail
useCamera(tool)        → pan/zoom state + pointer handlers
useBoardSocket(...)    → loads board via REST, connects socket, registers listeners
useHistory(...)        → undo/redo
<Canvas .../>          → uses useCanvas (drawing engine)
```
1. `useBoardSocket` calls `GET /api/whiteboards/:id` → sets name, strokes, shareCode, pending requests.
2. It connects Socket.io. The token is sent in the **handshake** (`auth: cb => cb({ token })` — read fresh on every reconnect).
3. Server `io.use(authenticate)` verifies JWT, stores `socket.data.userId`. Unauthenticated sockets are rejected before any event handler runs.
4. Client emits `join-board {boardId}`. Server checks in MongoDB that the user is owner or in `sharedWith` (`getBoardRole`), loads the username **from the DB** (never trusts a client-sent name), joins the Socket.io room `boardId`, stores presence `{userId, username, color, role}` in memory, and broadcasts `presence-update` to the room.

### 7.8 Drawing a pen stroke (the core loop)
```
pointerdown  → useCanvas.startDrawing
               currentStroke = { id: uuid, points:[[x,y]], color, size, tool:"pen" }
               start 1s hold timer (for shape snapping)
pointermove  → draw(): push [x,y] into currentStroke.points
               requestRender(overlay only)
               ── next animation frame ──
               drawOverlay() paints the in-progress stroke
               flushProgress() emits "stroke-progress" with ONLY the new points since last frame
pointerup    → finishDrawing(): push stroke into strokesRef, add to spatial index,
               onStrokesChange([...strokes])
                 → WhiteboardPage.handleStrokesChange:
                     1. pushToHistory(prev, next)         (undo stack)
                     2. length grew → emit "stroke-update" {stroke}
                     3. persistStrokes → debounced 1s PUT full array + thumbnail upload
```
On **other users' screens**:
- `stroke-progress` → stored in the `liveStrokes` frame store → drawn on *their* overlay canvas as you draw (they see your line grow live).
- `stroke-update` → appended to their `strokes` state → `useCanvas` re-indexes and draws it on the base canvas, and removes it from `liveStrokes`.

`handleStrokesChange` decides what to broadcast by comparing lengths:

| Change | Detected by | Event sent | Payload |
|---|---|---|---|
| Added a stroke | `new.length > old.length` | `stroke-update` | one stroke |
| Erased / deleted | `new.length < old.length` | `stroke-erase` | array of ids only |
| Moved / resized / snapped | same length | `board-sync` | full array |
| Undo / redo | via `onRestore` | `board-sync` | full array |

### 7.9 Eraser
On each pointer move, `handleEraser(x,y)` asks the **spatial index** for strokes whose bounding box touches the eraser circle, then does precise **point-to-segment distance** checks (`getDistanceToSegment`) only on those. Hit strokes are removed *whole* (stroke eraser, not pixel eraser). The change is committed once on pointerup.

### 7.10 Shapes tool
Drag from start to end; every move regenerates perfect points with `generateShapePoints(shapeType, start, end)` (`utils/shapeGeometry.js`) — rectangles, squares (forced equal sides), ellipses (60 points), triangles, diamonds, 5-point stars, lines, arrows (one continuous path: shaft → barb → tip → barb). A tiny drag (< 4 units) is treated as a click and cancelled (`stroke-cancel` tells others to drop the preview).

### 7.11 Hold-to-snap (AI)
See §10 for the model. The flow:
1. When a pen stroke starts, a 1000 ms timer starts.
2. On every move, if the pointer drifted > 10 units from the last tracked spot, the timer restarts. So the timer only fires if you **hold still for 1 s**.
3. Fire → `recognizeShape(points)` → `POST {VITE_ML_API_URL}/api/recognize`.
4. If the response is a known shape with confidence > 0.6, `generatePerfectShape(points, shape)` builds clean geometry from the stroke's bounding box (circle uses the max dimension as diameter; square/rectangle → 4 corners; line → first-to-last point).
5. Two race cases are handled (`triggerShapeSnap`):
   - **Still drawing**: replace the current stroke's points; set `progressRef.reset` so the next streamed batch replaces (not appends) the collaborators' preview.
   - **User already lifted the pen while the request was in flight**: find the committed stroke by id, update it in place, re-index, and emit a change.
6. Any error → "unknown" → keep the hand-drawn stroke (graceful degradation).

### 7.12 Select, move, resize, delete
- Click → `hitTestStroke` (spatial index candidates sorted top-most first → precise distance test) → `selectedId`.
- Drag inside → **move**: offset all points (or `x/y` for images/text) from a saved `original` copy.
- Drag a corner handle → **resize**: scale around the *opposite* corner (the anchor). Text scales its `fontSize` by the average scale factor.
- Delete/Backspace (not while typing in an input) removes the selected stroke.
- Selection box and handles are drawn on the overlay with line widths divided by `camera.scale` so they look the same size at any zoom.

### 7.13 Images and text
- **Image**: `ImageTool` uploads the file → `POST /:id/upload-image` (multer memory storage, image/* only, ≤ 10 MB) → stream to Cloudinary → returns URL → `insertImage(url)` places it at the center of the viewport, max 300 px side. Only the **URL** is stored in the stroke.
- **Text**: click with text tool → a positioned `<textarea>` appears; on blur/Enter the text becomes a `text` stroke at the clicked world coordinate.

### 7.14 Undo / redo — `hooks/useHistory.js`
Classic **two-stack** design: `past[]` and `future[]` of whole strokes-array **snapshots**.
- New change: push old array to `past`, clear `future`.
- Undo: pop from `past`, push current to front of `future`, set strokes.
- Redo: the reverse.
- After undo/redo, `onRestore` broadcasts `board-sync` and saves.

Because each change creates a *new array* that reuses unchanged stroke objects, snapshots are cheap-ish (structural sharing of stroke objects; only the array of references is copied).

### 7.15 Auto-save and thumbnail
`persistStrokes` → `useWhiteboard.debouncedSave` (1 s **debounce**: each new change cancels the previous timer) → `PUT /api/whiteboards/:id {strokes, name}` → then `saveThumbnail`: draw the visible canvas into a 320×180 offscreen canvas, export **JPEG at quality 0.7**, upload to `POST /:id/thumbnail`, which deletes the old Cloudinary thumbnail and stores the new URL. The Home page cards show these thumbnails.

The `PUT` authorizes inside the query itself: `findOneAndUpdate({ _id, $or: [{owner: me}, {sharedWith: {$elemMatch: {userId: me, role: "editor"}}}] }, ...)` — **viewers cannot save**, in one DB round-trip.

### 7.16 Sharing & access requests
```
Owner shares code/link ─► Visitor opens /join/ABC123
JoinBoard.jsx: GET /api/whiteboards/join/ABC123 (public; excludes sharedWith & pendingRequests)
                → shows a read-only Canvas
Visitor clicks "Request to Edit" (must be logged in)
  POST /:id/request-access → pendingRequests.push, Notification(request_received) to owner
  JoinBoard starts polling GET /:id every 5s
Owner sees it (notification bell polls unread count every 30s, or the board's pending list)
  approves → POST /:id/respond-request (or POST /notifications/:id/action)
     → remove from pending, sharedWith.push({userId, role:"editor"}),
       user.sharedBoards.push, Notification(request_approved) to requester
Visitor's poll sees themselves in sharedWith → redirect to /whiteboard/:id
```

### 7.17 Presence and live cursors
- Presence: server keeps `boardUsers[boardId][socketId] = {userId, username, color, role}` in memory. Colors come from an 8-color palette by join order. On `leave-board` or `disconnect`, the entry is removed, `presence-update` re-broadcast, and `cursor-leave` tells others to remove that cursor (and its live strokes).
- Cursors: on pointer move, the client converts the pointer to **world coordinates** and emits `cursor-move` at most **once per animation frame**. The server attaches username/color (from its own memory, not the client) and sends it as a **volatile** message. Receivers project world → screen using **their own camera**, so a cursor points at the same drawing regardless of each user's zoom/pan.

### 7.18 Export PNG — `components/whiteboard/BoardHeader.jsx`
Computes the bounding box of all strokes, creates an offscreen canvas of exactly that size + 40 px padding (× devicePixelRatio for sharpness), redraws strokes, `toDataURL("image/png")`, triggers a download via a temporary `<a download>`.

### 7.19 Account settings & delete account
`PATCH /me` (name/email/avatar upload to Cloudinary), `PATCH /me/password` (OAuth-only users can set a first password without the current one), `DELETE /me` → deletes owned boards, `$pull`s the user from every board's `sharedWith`/`pendingRequests`, deletes their notifications, deletes the user (cascade cleanup done manually since MongoDB has no foreign keys).

### 7.20 Complete socket event reference — `backend/socket/socketHandler.js`

| Event (client → server) | Server checks | Server emits to room (others) |
|---|---|---|
| `join-board {boardId}` | JWT already verified; DB access check; name from DB | `presence-update` (to everyone incl. sender) |
| `stroke-progress {stroke, from, points}` | joined & not viewer; shape of payload | `stroke-progress` |
| `stroke-update {stroke}` | joined & not viewer | `stroke-update` |
| `stroke-cancel {id}` | joined & not viewer | `stroke-cancel` |
| `stroke-erase {ids}` | joined & not viewer; ids is array | `stroke-erase` |
| `board-sync {strokes}` | joined & not viewer; array | `board-sync` |
| `cursor-move {x,y}` | joined | `cursor-move` (**volatile**, adds username/color) |
| `leave-board` / `disconnect` | — | `presence-update`, `cursor-leave` |

`socket.to(room).emit` = everyone in the room **except** the sender; `io.to(room).emit` = everyone **including** the sender.

### 7.21 REST API reference

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register`, `/login` | — | create account / sign in → JWT |
| `POST /api/auth/forgot-password`, `/reset-password` | — | reset flow |
| `GET/PATCH/DELETE /api/auth/me`, `PATCH /me/password` | JWT | profile |
| `GET /api/auth/:provider`, `/:provider/callback` | — | OAuth |
| `GET /api/whiteboards/join/:code` | — | public view-only board by share code |
| `GET /api/whiteboards` | JWT | list my + shared boards |
| `GET/PUT/DELETE /api/whiteboards/:id` | JWT | read / save (owner+editor) / delete (owner) |
| `POST /api/whiteboards` | JWT | create |
| `POST /:id/request-access`, `/:id/respond-request` | JWT | sharing |
| `POST /:id/upload-image`, `/:id/thumbnail` | JWT | Cloudinary uploads |
| `GET /api/notifications`, `/unread-count`; `PATCH /:id/read`, `/read-all`; `DELETE /:id`; `POST /:id/action` | JWT | notifications |
| ML: `POST /api/recognize {points}` | — | → `{shapeType, confidence}` |

---

## 8. The canvas engine (how drawing actually works)

File: `frontend/src/hooks/useCanvas.js` (+ `components/whiteboard/Canvas.jsx`).

### 8.1 Canvas 101
A `<canvas>` is a grid of pixels. You get a 2D context (`ctx`) and issue commands: `beginPath`, `moveTo`, `lineTo`, `stroke`, `drawImage`, `fillText`. Once drawn, pixels have no memory of "this was stroke #5" — so **we** keep the list of strokes (the *scene*) and **redraw** from it whenever something changes. This is called **immediate-mode rendering** (vs. SVG/DOM, which is *retained-mode*: the browser remembers each object).

### 8.2 Two layers (two stacked canvases)
```
┌───────────────────────────────┐  ← overlay canvas (on top, receives pointer events)
│  in-progress stroke (yours)   │     redrawn every frame while drawing
│  collaborators' live strokes  │
│  selection box + handles      │
├───────────────────────────────┤  ← base canvas (below)
│  all committed strokes,       │     redrawn ONLY when strokes or camera change
│  images, text                 │
└───────────────────────────────┘
```
See §11.1 for why.

### 8.3 Retina / high-DPI sharpness
On a 2× screen, a 1000-CSS-px canvas needs 2000 real pixels or lines look blurry. On resize (`ResizeObserver` + window resize), each canvas's bitmap is set to `cssSize × devicePixelRatio`, and drawing uses a transform multiplied by `dpr`. Resizing a canvas clears it, so it's repainted synchronously right after.

### 8.4 One transform for everything — `beginFrame`
```js
ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(...);        // reset + clear
ctx.setTransform(k*scale, 0, 0, k*scale, k*cam.x, k*cam.y); // k = dpr
```
After this, we draw strokes using their **world** coordinates and the GPU/canvas maps them to the screen. `setTransform(a,b,c,d,e,f)` is the 2D affine matrix: `screenX = a·x + c·y + e`, `screenY = b·x + d·y + f`.

### 8.5 Rendering a stroke
A stroke is a **polyline**: `moveTo(first)`, `lineTo(each next)`, `stroke()` with `lineJoin = lineCap = "round"` so joints and ends look like a felt pen.

### 8.6 Refs vs. state — a key React concept here
- **State** (`useState`): changing it triggers a React re-render. Good for UI.
- **Ref** (`useRef`): a mutable box; changing it does **not** re-render.

The engine keeps the hot data in refs — `strokesRef`, `currentStroke`, `cameraRef`, `dragStateRef`, `progressRef` — because pointer moves happen ~60–240 times/second; re-rendering React on each would be wasteful. React state (`strokes` in `useWhiteboard`) is only updated on *commit* (pointerup), which flows back into `useCanvas` via the `loadStrokes` prop and rebuilds the index.

### 8.7 Hit-testing math — distance from a point to a segment
To know if the click/eraser at `p` touches segment `v→w`:
1. Project `p` onto the infinite line: `t = ((p−v)·(w−v)) / |w−v|²`.
2. Clamp `t` to `[0,1]` so the closest point stays on the segment.
3. Closest point `= v + t(w−v)`; distance `= |p − closest|`.
4. Hit if distance ≤ `stroke.size/2 + tolerance`.

(`getDistanceToSegment` in `useCanvas.js`.) Tolerances are divided by `camera.scale` so clicking feels equally forgiving at every zoom.

---

## 9. The camera — pan & zoom math

File: `frontend/src/hooks/useCamera.js`. The camera is `{ x, y, scale }`.

### 9.1 Two coordinate systems
- **World coordinates**: where a stroke *is* on the infinite board (stored in DB).
- **Screen coordinates**: pixels in your browser window.

```
screen = world × scale + offset        (offset = camera.x / camera.y)
world  = (screen − offset) / scale
```
Every pointer event is converted to world coords (`getMouseCoordinates`) before being stored, so drawings are independent of how zoomed in the author was.

### 9.2 Panning
Change `offset` by the mouse movement (`e.movementX/Y`). Triggers: hand tool, middle mouse button, or holding **Space** (like Figma).

### 9.3 Zoom toward the cursor (the classic interview derivation)
Goal: the world point under the mouse must stay under the mouse after zooming.
```
Before: world = (mouse − oldOffset) / oldScale
After:  mouse = world × newScale + newOffset
⇒ newOffset = mouse − (mouse − oldOffset) × (newScale / oldScale)
```
That's exactly `newX = mouseX - (mouseX - prev.x) * scaleRatio` in `handleWheel`. The +/- buttons do the same around the screen center. Scale is clamped (`ZOOM` in `utils/constants.js`: 0.5–5 for buttons/pinch).

### 9.4 Pinch-zoom on touch devices
Track active touch pointers in a `Map(pointerId → position)`. With two fingers:
- `distanceRatio = newFingerDistance / oldFingerDistance` → new scale.
- Zoom around the **midpoint** of the fingers (same formula as 9.3).
- Plus pan by how much the midpoint moved.
Pinching disables drawing (`isDrawMode` in `WhiteboardPage.jsx`). Defensive null-checks handle iPadOS firing `pointerup` mid-gesture.

### 9.5 Infinite grid background
The grid is a CSS background on the base canvas whose `backgroundSize = 24 × scale` and `backgroundPosition = camera offset` — the browser draws it, zero JS cost per frame.

---

## 10. The ML shape-recognition service

Files: `pythonServer/train.py`, `preprocess.py`, `main.py`.

### 10.1 The problem
Input: a list of `[x, y]` points of arbitrary length, any size, anywhere on the board. Output: one of `circle | square | triangle | line` (or "unknown"). This is **sequence classification**.

### 10.2 Data — Google QuickDraw
`.ndjson` files: one JSON drawing per line, each drawing = several strokes as `[[xs...],[ys...]]`. Training takes the first **10,000 drawings per class** and concatenates all strokes of a drawing into one point sequence.

### 10.3 Preprocessing (same code in training AND serving — very important)
`preprocess_stroke(points, num_points=64)`:
1. **Resample to exactly 64 points, evenly spaced along the path length.**
   - Compute segment lengths → cumulative distance → `np.linspace(0, total, 64)` targets → `np.interp` x and y.
   - *Why*: a neural net needs fixed-size input; also a slow drawer produces many points and a fast one few — arc-length resampling removes speed from the equation.
2. **Normalize**: shift so the bounding box starts at (0,0), divide by the **larger** side → fits in [0,1].
   - *Why*: position and size don't matter for "is it a circle". **Uniform** scaling (same factor on x and y) preserves aspect ratio, so a line doesn't become a square.
3. Add batch dimension → shape `(1, 64, 2)`.

**Training/serving skew** is a top cause of ML bugs in production; sharing one `preprocess.py` file prevents it.

### 10.4 Data augmentation (×3 data for free)
For each drawing: the original, a **vertically flipped** copy (`y → 1 − y`), and a **reversed-direction** copy (`[::-1]`, someone drawing the circle the other way). Result: 4 classes × 10k × 3 = **120,000** samples. Makes the model robust to drawing direction/orientation.

### 10.5 The model — a 1-D CNN
```
Input (64, 2)                         # 64 points × (x,y)
Conv1D(32 filters, kernel 3, ReLU) → (62, 32)   # local features: tiny curves/corners
MaxPooling1D(2)                    → (31, 32)
Conv1D(64, kernel 3, ReLU)         → (29, 64)   # bigger patterns: arcs, straight runs
MaxPooling1D(2)                    → (14, 64)
Flatten                            → 896
Dense(128, ReLU)
Dropout(0.3)                                    # regularization: randomly drop 30% during training
Dense(4, softmax)                               # probabilities for the 4 classes
≈ 122k parameters (224 + 6,208 + 114,816 + 516)
```
- **Why 1-D convolution?** The input is a *sequence*. A kernel sliding along it detects local patterns (a corner = sharp direction change; a circle = constant curvature) regardless of *where* in the sequence they happen (translation invariance). It's far cheaper than an RNN/LSTM and much smaller than rendering to an image and using a 2-D CNN.
- **Loss**: sparse categorical cross-entropy (labels are integers 0–3). **Optimizer**: Adam. 15 epochs, batch 64, 20% validation split, data shuffled first.
- `CATEGORIES` order in `main.py` **must** match `train.py` — the model outputs index 2, and only that list says index 2 = "triangle".

### 10.6 Serving
- The model is loaded **once at startup** into memory (loading takes seconds; doing it per request would be terrible).
- `POST /api/recognize`: Pydantic validates `{points: List[List[float]]}` → preprocess → `model.predict` → `argmax` → if confidence < 0.60 return `"unknown"`.
- CORS is restricted to `FRONTEND_URL` origins.

### 10.7 Why a confidence threshold?
Softmax always picks *something*, even for a random scribble. Requiring 60% avoids "snapping" doodles that aren't really shapes. The frontend double-checks (`> 0.6`). Precision > recall here: a wrong snap is far more annoying than a missed one.

---

## 11. Optimizations — what, why, and how

> **How to talk about optimization in an interview:** always say (1) the **symptom/problem**, (2) the **root cause**, (3) the **fix**, (4) the **trade-off**, (5) how you'd **measure** it. Below, every item follows that shape.

### General principles behind all of them
1. **Do less work** — don't draw what's off-screen, don't send what didn't change.
2. **Do work less often** — batch into one-per-frame, debounce saves.
3. **Do work in the cheapest place** — refs instead of React state, CSS instead of JS, relay instead of DB.
4. **Make lookups sub-linear** — spatial index instead of scanning everything.

The browser has ~**16.7 ms per frame** at 60 fps (8.3 ms at 120 Hz). Anything that blows that budget causes visible stutter ("jank").

---

### 11.1 Two-layer canvas (base + overlay)
- **Problem:** with one canvas, every pointer move while drawing had to clear and **redraw the whole board** (every stroke ever drawn) just to extend one line. Cost per frame = O(total strokes). Big boards → laggy pen. (This was literally noted in `Docs/TODO.md`.)
- **Fix:** committed strokes live on the **base** canvas, redrawn only when strokes or the camera change. The current stroke, collaborators' live strokes and selection UI live on the **overlay**, which is cheap to redraw because it contains very little.
- **How:** `requestRender(base, overlay)` marks which layer is dirty. While drawing, only `requestRender(false, true)` is called.
- **Trade-off:** two bitmaps = 2× canvas memory; slightly more code. Overlay must be on top and receive pointer events.
- **Measure:** Chrome DevTools → Performance → record drawing on a board with ~5k strokes; compare scripting time per frame.

### 11.2 Frame-batched rendering with `requestAnimationFrame` + dirty flags
- **Problem:** pointer events can fire faster than the screen refreshes (e.g. 240 Hz pens, coalesced events). Redrawing on each event wastes work the user will never see.
- **Fix:** `requestRender` sets dirty flags and schedules **at most one** `requestAnimationFrame` callback. Many calls in one frame → one draw.
- **How:** `frameRef` holds the pending handle; if non-null, return early. `renderFrame` checks flags, draws needed layers, clears flags.
- **Subtle bug handled:** React **StrictMode** runs effects twice in dev; the cleanup cancels the frame **and resets the handle to null**, otherwise `requestRender` would think a frame is forever pending and never draw again.
- **Why rAF and not setTimeout?** rAF syncs with the display refresh, pauses in background tabs (saves battery), and runs right before paint.

### 11.3 Spatial index (uniform grid) — the biggest win
File: `frontend/src/utils/spatialIndex.js`.
- **Problem:** three operations were **O(n)** over all strokes:
  1. Rendering: drawing every stroke even if it's 50,000 px off-screen.
  2. Eraser: every pointer move checked every segment of every stroke.
  3. Click-select hit-testing: same.
  On an infinite canvas, boards grow large, and most strokes are off-screen.
- **Fix:** a **uniform grid** spatial hash. World space is divided into 256×256 cells. Each stroke's bounding box (padded by half its line width) is inserted into every cell it overlaps. A query box only visits the cells it covers, then does an exact bbox-intersection check.
  ```
  key = `${floor(x/256)},${floor(y/256)}`  →  Set<item>
  search(viewport) → only items in the visible cells
  ```
- **Used for:**
  - **Viewport culling** in `drawBase`: compute the visible world rectangle from the camera, draw only those strokes (sorted by `order` to keep correct z-order since a Set loses ordering).
  - **Eraser** and **hit-testing**: query a small box around the pointer, then run the precise point-to-segment test only on a handful of candidates.
- **Complexity:** from O(N) to roughly O(cells visited + k) where k = nearby strokes. For erasing on a 10,000-stroke board, you test maybe 5 strokes instead of 10,000.
- **Bonus:** images that are off-screen are never even *requested* from the network (lazy loading for free), because `renderImage` is only called for visible items.
- **Incremental updates:** `indexStroke` removes the old entry and reinserts one stroke after add/move/resize/snap; `rebuildIndex` is only used for bulk changes (load, erase, remote sync).
- **Why a uniform grid instead of a quadtree / R-tree?**
  - Dead simple (~60 lines), O(1) cell lookup, cheap inserts/removes — strokes move and change constantly.
  - Whiteboard content is spread fairly evenly at human scale; quadtrees shine with very uneven density.
  - Trade-off: a gigantic stroke spans many cells (inserted many times); if you zoom far out, the viewport covers many cells. An R-tree (e.g. the `rbush` library) would handle extreme cases better — a good "what would you do next" answer.

### 11.4 One combined transform per frame
- **Before:** `save()` → `scale(dpr)` → `translate(camera)` → `scale(zoom)` → ... → `restore()`.
- **After:** a single `setTransform(k·s, 0, 0, k·s, k·x, k·y)` in `beginFrame`. Fewer state changes, no save/restore stack, and both layers share the same helper so they can never disagree.

### 11.5 Keeping high-frequency data out of React state — `frameStore` + `useSyncExternalStore`
File: `frontend/src/utils/frameStore.js`.
- **Problem:** remote cursors were `useState` in `useBoardSocket`, which lives in `WhiteboardPage`. Every incoming `cursor-move` (dozens per second *per collaborator*) re-rendered the **entire page** — toolbar, header, canvas component.
- **Fix:** a tiny **external store** outside React: `get()`, `set(updater)`, `subscribe(listener)`. `set` updates the value immediately but notifies subscribers **at most once per animation frame**. Only the small `RemoteCursors` component subscribes, via React 18+'s `useSyncExternalStore`, so only it re-renders.
- Same store type holds `liveStrokes` (collaborators' in-progress strokes); `useCanvas` subscribes and redraws just the overlay — no React render at all.
- **Interview phrase:** "I moved high-frequency state out of the React tree and into an external store with frame-coalesced notifications, so 50 socket messages in a frame cost one render of one leaf component."

### 11.6 Throttle outgoing cursor updates to one per frame
`Canvas.jsx` stores the latest pointer position in a ref and sends it in a `requestAnimationFrame` callback — max ~60 messages/s even if the mouse fires at 1000 Hz. Only the *latest* position matters; intermediate ones are dropped.

### 11.7 `volatile` cursor messages on the server
`socket.volatile.to(room).emit('cursor-move', ...)`. Normal Socket.io messages are **buffered** if a client is slow or briefly disconnected and then delivered in a burst — for cursors that means a stale cursor "replaying" its path. Volatile messages are simply **dropped** if they can't be sent right now. Perfect for data where only the newest value matters (cursors, not strokes!).

### 11.8 Delta streaming of in-progress strokes (`stroke-progress`)
- **Before:** collaborators only saw your stroke when you lifted the pen (whole stroke at once — felt laggy).
- **Naive fix (bad):** send the whole stroke every move → O(n²) bytes over a long stroke.
- **Actual fix:** `progressRef` remembers how many points were already sent. Each frame, `flushProgress` sends only `points.slice(from)` with the `from` index. Receivers append (`from > 0`) or replace (`from === 0`).
- **Replace mode (`reset`)** is used when the points are rewritten rather than appended — dragging a shape (geometry regenerated each move) or after an AI snap.
- Batched per frame (it's called inside `renderFrame`), so message rate ≤ 60/s.
- `stroke-cancel` cleans up previews of shapes that were too small to commit; `cursor-leave` cleans up previews of users who disconnected mid-stroke.

### 11.9 Smallest possible payload per change type
- Add → `stroke-update` sends **one** stroke (not the board).
- Erase → `stroke-erase` sends **only ids** (a few bytes each) instead of the full array (could be megabytes).
- Only moves/resizes/undo still send the full array (`board-sync`) — a known remaining cost (§15).

### 11.10 Socket server as a stateless relay
The server never writes strokes to MongoDB on socket events. It checks permissions from **in-memory** presence (`canEdit`) — no DB hit per message — and forwards. DB access happens only on `join-board` (once). `getBoardRole` and the user lookup run **in parallel** with `Promise.all`, and `getBoardRole` uses `.select('owner sharedWith')` to fetch only needed fields (not the heavy strokes array).

### 11.11 Debounced auto-save
Each change resets a 1-second timer; only when the user pauses does the `PUT` happen. Drawing 30 strokes quickly → 1 request, not 30. (Debounce = "wait until things calm down"; throttle = "at most once per X". Know the difference!)

### 11.12 Images/thumbnails in Cloudinary, not in MongoDB
- Storing base64 images inside the strokes array would bloat the document (base64 is ~33% bigger than binary), slow every board load and save, and hit the 16 MB document limit quickly.
- Instead: upload to Cloudinary (a CDN — served from edge locations near the user, cached), store only the URL.
- Upload path: `multer.memoryStorage()` keeps the file in RAM as a Buffer (no temp files on disk), then `upload_stream` pipes it to Cloudinary. 10 MB limit + `image/*` filter prevent abuse.
- **Thumbnails**: downscaled to **320×180 JPEG at 0.7 quality** in the browser before upload (a few KB vs. a full-screen PNG of hundreds of KB). The old thumbnail is deleted from Cloudinary to avoid storage leaks.
- **Image cache** (`imageCacheRef` Map): each image URL is decoded once and reused every frame; `img.onload` triggers a base-only redraw.

### 11.13 Route-level code splitting (lazy loading)
`Router.jsx` uses `React.lazy(() => import("./pages/..."))` + `<Suspense>`. Vite emits a separate JS chunk per page. A visitor to the landing page doesn't download the whiteboard engine, and a user on the whiteboard doesn't download the landing page animations (framer-motion etc.). Smaller initial bundle → faster first paint / Time-to-Interactive.

### 11.14 Database query optimizations
- **Projections** (`.select(...)`): board list excludes `strokes` (the heaviest field); socket role check selects just `owner sharedWith`; `joinByCode` excludes private fields.
- **Authorization inside the query**: `findOneAndUpdate({_id, $or:[owner, editor]})` → permission check + update in **one round-trip** and no race between check and write.
- **Compound indexes** on notifications matching the exact query + sort (`{recipient, createdAt:-1}`, `{recipient, isRead}`) → MongoDB walks the index instead of scanning and sorting in memory.
- **Unique indexes** on `email`, `shareCode`, sparse unique on `googleId/githubId` — both integrity and fast lookups.
- `countDocuments` for unread badge instead of fetching documents; list capped with `.limit(50)`.

### 11.15 ML-side efficiency
- Model loaded once at startup.
- Fixed 64-point input → constant inference cost regardless of how long the stroke is.
- Tiny model (~122k params) → fast on CPU; `tensorflow-cpu` → smaller deploy.
- **Client-side gating**: the request is only made if the user *holds still for 1 s* and the stroke has > 5 points — so the ML server isn't called on every stroke.
- Graceful degradation: any failure → "unknown" → normal stroke; drawing is never blocked waiting for ML (the call is async; the race where the pen is lifted first is handled).

### 11.16 Smaller wins
- **Pointer capture** (`setPointerCapture`): keep receiving moves even when the pointer leaves the canvas mid-stroke — no broken strokes.
- **`touch-action: none`** (`touch-none`): stops the browser from scrolling/zooming the page while drawing on touch devices.
- **ResizeObserver**: keeps canvas bitmaps matched to their CSS size without polling.
- **CSS-driven grid** and **CSS-driven custom cursor** (style mutated directly via a ref, no React render).
- **Notification polling** only fetches the cheap unread *count* every 30 s, not the full list.
- `useCallback`/`useMemo` to keep function identities stable and avoid re-running effects (e.g. `Home.jsx` filtering in `useMemo`).

### 11.17 How you'd prove these optimizations (measurement)
- Chrome DevTools **Performance** panel: record drawing/panning; check frame times and "Scripting" cost.
- **React DevTools Profiler**: confirm cursor messages no longer re-render `WhiteboardPage`.
- **Network → WS tab**: inspect message sizes/rates for `stroke-progress` and `cursor-move`.
- Synthetic test: generate 10k random strokes, time `drawBase` and eraser queries before/after the spatial index.
- `vite build` output: compare chunk sizes before/after lazy routes.

---

## 12. Security

| Threat | Defense in this codebase |
|---|---|
| Password database leak | bcrypt (salted, cost 12) — slow by design; `select:false` so hashes are never returned by default |
| Brute-forcing which emails exist | Generic login error; forgot-password always gives the same response |
| Reset-token theft from DB | Only SHA-256 hash stored; 15-minute expiry; single use |
| Session hijack / forged identity | Signed JWT (HMAC with `JWT_SECRET`), 7-day expiry, verified on every REST call **and** socket handshake |
| Client lying about its name/role in sockets | Username loaded from DB; role from DB at join; edit events dropped for non-joined or `viewer` sockets |
| Viewers editing via REST | Save/upload queries require owner or `role:"editor"` *inside* the query |
| OAuth login-CSRF | random `state` in an httpOnly, SameSite=Lax cookie, compared on callback |
| OAuth account takeover via unverified email | only provider-**verified** emails are linked |
| JWT leaking in logs (OAuth) | token passed in URL fragment, removed via `history.replaceState` |
| Malicious input / NoSQL injection-ish params | express-validator (`isMongoId`, email normalization, lengths); Mongoose casting |
| Malicious uploads | `image/*` mime filter, 10 MB limit, memory storage, stored on Cloudinary not our server |
| Cross-origin abuse | hand-rolled CORS allow-list from `CLIENT_URL` (REST + sockets); FastAPI CORS from `FRONTEND_URL` |
| Leaking internals in errors | `errorHandler`: only `isOperational` errors show their message; others become generic 500 (stack only in development) |
| Secrets in code | all secrets in `.env` (`.env.example` documents them); GitHub Actions uses repository secrets / OIDC for Azure |

**Known weaker spots** (good to mention proactively — shows maturity): JWT in `localStorage` is readable by any XSS (an httpOnly cookie would be safer but needs CSRF protection); no rate limiting on login/forgot-password; share code uses `Math.random` (not cryptographically secure) and is only 6 chars; ML endpoint is unauthenticated; no `helmet` security headers.

---

## 13. Deployment, environments & CI/CD

| Service | Where | How |
|---|---|---|
| Frontend | **Vercel** (`https://lienwand.vercel.app`) | Static build from Vite; `vercel.json` rewrites all paths to `/index.html` so client-side routes like `/whiteboard/123` work on refresh |
| Backend | **Azure Web App** `lienwand-node` | GitHub Actions on push to `main`: checkout → Node 20 → `npm install` → upload artifact → Azure login (OIDC: `id-token: write`, no long-lived password) → `webapps-deploy` |
| ML server | separate host (Uvicorn) | `uvicorn main:app`; `FRONTEND_URL` for CORS |
| Database | MongoDB (`MONGO_URL`) | Mongoose connection; process exits if connection fails (fail fast) |
| Files | Cloudinary | `CLOUDINARY_*` env vars |

**Environment variables** — backend: `MONGO_URL, JWT_SECRET, PORT, CLIENT_URL (comma-separated; first = OAuth redirect target), SERVER_URL, CLOUDINARY_*, SMTP_*, GOOGLE_*, GITHUB_*`. Frontend: `VITE_API_URL, VITE_ML_API_URL` (Vite only exposes vars prefixed `VITE_` to the browser — never put secrets there).

**Why the SPA rewrite?** In a single-page app the server only has `index.html`; the browser-side router decides what `/home` shows. Without the rewrite, refreshing `/home` asks the server for a file called `home` → 404.

---

## 14. Methodologies & design patterns used

- **Layered (N-tier) backend**: `routes → middleware → controllers → services → models`. Routes only wire things; controllers handle HTTP; services hold reusable logic (token, password, upload, oauth); models define data. Easier to test and change one layer at a time.
- **Middleware chain / Chain of Responsibility**: `protect`, validation chains ending in `validate`, `upload.single(...)`, then the controller — each can stop the request.
- **Centralized error handling**: `catchAsync` wraps async controllers so a rejected promise goes to `next(err)`; `ApiError` carries `statusCode` + `isOperational`; one `errorHandler` formats every error.
- **Strategy pattern**: `oauthService.providers` — Google and GitHub implement the same interface (`authUrl`, `getProfile`) returning the same normalized profile shape, so the callback controller doesn't care which provider it is. Adding Microsoft login = add one object.
- **Custom hooks for separation of concerns** (frontend): `useCanvas` (drawing), `useCamera` (navigation), `useHistory` (undo), `useBoardSocket` (network), `useWhiteboard` (board state + saving). The page composes them.
- **Context API** for truly global state (auth user, theme, toasts, socket factory), avoiding prop drilling.
- **Observer / pub-sub**: Socket.io events; the `frameStore` subscribe/notify.
- **Room-based broadcasting**: one Socket.io room per board = natural multi-tenancy for realtime.
- **Optimistic local updates**: your own stroke appears instantly; the server is never awaited for drawing.
- **Last-write-wins** consistency: whoever saves the full array last wins (simple; see §15 for conflicts).
- **Graceful degradation**: ML down → app still works; image load fails → simply not drawn.
- **Fail fast**: no DB → backend exits instead of half-running.
- **Microservice for ML**: separate deployable with a tiny JSON contract.
- **Configuration via environment** (12-factor app style).
- **Iterative development**: tracked in `Docs/TODO.md` (features checked off incrementally), PRD/TRD written first.

---

## 15. Known limitations & what I'd improve next

Interviewers *love* "what would you do differently?" Being honest and specific is a strength.

| Limitation | Why it matters | Improvement |
|---|---|---|
| **Last-write-wins on the full array.** Two users save at nearly the same time → one user's recent strokes can be overwritten in the DB. Moves send the whole board (`board-sync`) and can clobber a concurrent add. | Data loss under real concurrency | Operation-based sync: send ops (`add/erase/move` by id) and apply them server-side with `$push`/`$pull`/positional updates; or use a **CRDT** (e.g. **Yjs**) which merges concurrent edits automatically; or OT (what Google Docs uses) |
| **Full-array `PUT` every save** (hence `express.json({limit:"50mb"})`) | O(board size) bandwidth and DB write per save | Persist deltas; or persist on the server from the socket stream in batches |
| **Embedded strokes → 16 MB document limit** | Very big boards will fail to save | Separate `strokes` collection indexed by `boardId`, or chunked documents |
| **Presence is in process memory** (`boardUsers`) | Can't run 2+ backend instances: users on different instances wouldn't see each other | `@socket.io/redis-adapter` (Redis pub/sub) + sticky sessions; presence in Redis |
| **Socket permission is checked at join** | If the owner removes someone, an open socket keeps its role until reconnect | Re-validate on role change / emit a kick event |
| **Unbounded undo history of full snapshots** | Memory grows on long sessions | Cap at e.g. 100 entries, or store inverse operations instead of snapshots |
| **Move/resize/snap mutate stroke objects in place** (`s.points = ...`, `s.x = ...` in `useCanvas`) while history snapshots share those same objects | Undo of a move/resize likely won't restore the old position (verify: draw → move → Ctrl+Z) | Treat strokes immutably: replace the stroke object with a copy when editing |
| **Save loss window** | Close tab within 1 s of last change → lost | Flush on `visibilitychange`/`beforeunload` with `navigator.sendBeacon`; or server-side persistence from the socket |
| **Export ignores images/text** and would throw on them (`stroke.points` is undefined for image/text in `exportToPng`) | Export bug | Reuse the same render functions as the canvas and the stroke bbox helper |
| **Polling** for approvals (5 s) and notification count (30 s) | Latency + wasted requests | Push via Socket.io user rooms (`socket.join(userId)`) |
| **Security**: JWT in localStorage, no rate limiting, `Math.random` share code, unauthenticated ML endpoint, no helmet | Attack surface | httpOnly cookie + CSRF token; `express-rate-limit`; `crypto.randomInt`; API key or route ML through backend; `helmet` |
| **No automated tests** | Regressions go unnoticed | Unit tests for `spatialIndex`, `shapeGeometry`, `preprocess`; API tests with supertest + mongodb-memory-server; Playwright for multi-user drawing |
| **Small code-quality nits** | — | `populate("sharedWith.userId", "name, profilePicture")` has a stray comma; `handleNotificationAction` calls another controller with a fake req/res (move shared logic into a service); FastAPI raises `HTTPException(400)` inside a `try` whose `except Exception` turns it into 500; wheel zoom min is 0.1 while `ZOOM.MIN` is 0.5 |
| **ML**: 4 classes, square vs. rectangle not distinguished, QuickDraw multi-stroke drawings concatenated | Limited recognition | More classes (arrow, star, diamond), aspect-ratio-based rectangle/square, a proper held-out test set & confusion matrix, quantize/convert to TF.js to run in the browser (no server round-trip) |

---

## 16. Interview Q&A bank

**Q: Walk me through what happens when I draw a line and my teammate sees it.**
A: Pointer down creates a stroke with a UUID in a ref; pointer moves append world-coordinate points and mark the overlay canvas dirty; once per animation frame we draw the overlay and emit `stroke-progress` with only the new points. The server checks I've joined the board room and am not a viewer, then relays to the room. My teammate's client stores it in an external frame store and paints it on their overlay. On pointer up I commit the stroke, emit `stroke-update`, and a 1-second debounced REST `PUT` saves the full array to MongoDB, then uploads a thumbnail.

**Q: Why WebSockets instead of HTTP polling?**
A: Drawing needs low latency and server push. Polling adds up to one interval of delay and wastes requests when nothing changed. WebSockets keep one persistent full-duplex TCP connection — tiny per-message overhead, server can push instantly. Socket.io adds reconnection, rooms, and a long-polling fallback.

**Q: Why not save to the DB on every socket event?**
A: Hundreds of writes per second per user, mostly for intermediate points that are superseded milliseconds later. Separating realtime (relay, in-memory) from persistence (debounced REST) keeps the DB load tiny. Trade-off: up to ~1 s of work could be lost on crash, and concurrent saves are last-write-wins.

**Q: How do you handle two people editing at once? Conflicts?**
A: Currently adds are merged naturally (each client appends the other's strokes by id) but persistence is last-write-wins on the full array, so near-simultaneous saves can drop strokes. The proper fix is op-based persistence or a CRDT like Yjs, where each stroke is an entry in a shared map that merges deterministically.

**Q: How does zoom-to-cursor work?**
A: Keep the world point under the cursor fixed: `newOffset = mouse − (mouse − oldOffset) × newScale/oldScale`. (Derive it from `screen = world·scale + offset`.)

**Q: How do you know which stroke I clicked on a canvas, since canvas has no DOM elements?**
A: Convert the click to world coords, query the spatial grid for strokes whose padded bbox contains that point, sort top-most first, and do a precise point-to-segment distance test against each segment; for images/text, a bbox containment test.

**Q: Explain the spatial index and its complexity.**
A: Uniform grid of 256-unit cells, a hashmap from `"cx,cy"` to a Set of items. Insert/remove touch only the cells a bbox overlaps. Queries visit only cells overlapping the query box, then do exact bbox checks and dedupe. Rendering, erasing and hit-testing go from O(N) to roughly O(k) for k nearby strokes. Chosen over a quadtree/R-tree for simplicity and cheap updates; an R-tree would be better for extreme size variance.

**Q: Why two canvases?**
A: The expensive part (all committed strokes) only redraws when it changes; the per-frame part (current stroke, live strokes, selection) is tiny. That turns per-frame drawing cost from O(board) into O(current stroke).

**Q: Why requestAnimationFrame?**
A: Coalesces many events into at most one render per display refresh, aligned with paint, and paused in hidden tabs.

**Q: How did you stop live cursors from lagging the whole UI?**
A: Cursors were React state at page level, so every message re-rendered the page. I moved them to an external store that notifies at most once per frame and subscribed only a small `RemoteCursors` component via `useSyncExternalStore`. Outgoing cursor emits are also throttled to one per frame, and the server sends them as `volatile` so stale positions are dropped rather than queued.

**Q: What's `useSyncExternalStore` and why not `useState` + `useEffect`?**
A: It's the official React API for subscribing to state that lives outside React. It's concurrency-safe (no "tearing" where different components see different values in one render) and lets only subscribers re-render.

**Q: Debounce vs. throttle?**
A: Debounce waits until events stop for X ms, then runs once (auto-save). Throttle runs at most once per X ms during a continuous stream (cursor emit per frame).

**Q: How does authentication work for sockets?**
A: The JWT is sent in the Socket.io handshake `auth` payload. An `io.use` middleware verifies it before connection and sets `socket.data.userId`. Board access is verified against MongoDB at `join-board`, and edit events are dropped for viewers.

**Q: JWT vs sessions?**
A: JWT is stateless — any server instance can verify it with the secret, no session store needed, and the same token works for REST and sockets. Downside: can't easily revoke before expiry (would need a denylist or short-lived access + refresh tokens).

**Q: Why bcrypt and not SHA-256 for passwords?**
A: SHA-256 is designed to be fast, so attackers can try billions of guesses per second. bcrypt is deliberately slow and salted (cost 12 → ~2¹² rounds), making brute force impractical and rainbow tables useless.

**Q: Walk me through OAuth.**
A: Authorization Code flow: backend redirects to provider with `client_id`, `redirect_uri`, `scope`, and a random `state` stored in an httpOnly cookie. Provider redirects back with `code`; backend checks `state`, exchanges `code` + `client_secret` for an access token server-side, fetches the profile, requires a verified email, finds/links/creates the user, issues our own JWT and redirects to the frontend with it in the URL fragment.

**Q: Explain the ML model.**
A: Preprocess any stroke to 64 arc-length-evenly-spaced points normalized to a unit box (aspect preserved). A 1-D CNN (two Conv1D+MaxPool blocks → Dense 128 → Dropout → softmax over 4 classes, ~122k params) trained on 10k QuickDraw drawings per class with flip and reverse augmentation. Served by FastAPI with the model loaded once; predictions below 60% confidence return "unknown".

**Q: Why resample by arc length rather than just taking every n-th point?**
A: Raw points are sampled in time, so they cluster where the user drew slowly. Arc-length resampling spaces them evenly along the shape, removing drawing speed as a confounding variable and giving a fixed-size input.

**Q: Why a 1-D CNN and not an LSTM or a 2-D image CNN?**
A: The data is a short sequence; convolutions capture local geometric patterns (corners/curves) with translation invariance, train fast, and are tiny. LSTMs are slower and harder to train; rasterizing to an image and using a 2-D CNN is heavier and loses ordering info.

**Q: How would you scale this to 100k concurrent users?**
A: Run multiple Node instances behind a load balancer with sticky sessions; Socket.io Redis adapter to broadcast across instances; presence in Redis; stroke persistence as ops in a separate collection (sharded by `boardId`) or a CRDT document store; CDN for assets (already Cloudinary); horizontally scale the stateless ML server or move inference to the browser with TF.js; rate limiting; monitoring (metrics on socket rooms, message rates, save latency).

**Q: What happens if the ML server is down?**
A: `recognizeShape` catches the error and returns "unknown", so the stroke stays as drawn. Nothing else depends on it.

**Q: How do you store images?**
A: Upload via multipart to the backend (multer memory storage, mime filter, 10 MB cap), stream to Cloudinary, store only the URL in the stroke. Keeps MongoDB documents small and images CDN-served.

**Q: What is CORS and why hand-roll it?**
A: Browsers block JS from reading responses from another origin unless the server allows it via `Access-Control-Allow-Origin`. We allow only origins listed in `CLIENT_URL`, echo the specific origin (required with credentials), and answer `OPTIONS` preflights with 204. It's driven by the same `ALLOWED_ORIGINS` constant as the Socket.io CORS config so they can't drift apart.

**Q: What's the biggest bug/challenge you faced?**
Good candidates from this codebase: (1) the **StrictMode rAF handle** — double-invoked effects left a stale non-null frame handle so nothing ever rendered; fixed by resetting it to null in cleanup. (2) The **async snap race** — the user can lift the pen while the ML request is in flight; handled by checking whether the stroke is still current or already committed. (3) **iPad pinch** — `pointerup` racing with `pointermove` nulling pinch state; fixed with a guard right before use.

**Q: What would you do differently?**
Pick 2–3 from §15: CRDT/op-based sync, Redis adapter for horizontal scale, tests, immutable stroke updates, httpOnly cookie auth.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| **SPA** | Single-Page Application — one HTML page; JS swaps views without full reloads |
| **REST** | API style using HTTP verbs (GET/POST/PUT/DELETE) on resource URLs |
| **WebSocket** | Persistent, two-way connection between browser and server |
| **Socket.io room** | A named group of sockets; emit to a room = broadcast to its members |
| **JWT** | JSON Web Token: `header.payload.signature`, signed so the server can verify it wasn't tampered with |
| **bcrypt** | Slow, salted password hashing algorithm |
| **Salt** | Random data mixed into a hash so identical passwords hash differently |
| **OAuth 2.0** | Protocol to let users log in via another provider without giving you their password |
| **CORS** | Browser rule controlling cross-origin requests |
| **Middleware** | Function in a request pipeline that can inspect/modify/stop a request |
| **ODM (Mongoose)** | Object-Document Mapper: schemas & models over MongoDB |
| **Projection** | Choosing which fields a query returns (`.select`) |
| **Index** | Data structure making lookups/sorts fast (like a book index) |
| **Debounce / Throttle** | Run once after activity stops / run at most once per interval |
| **requestAnimationFrame (rAF)** | Browser callback right before the next screen repaint |
| **DPR** | devicePixelRatio — physical pixels per CSS pixel (2 on Retina) |
| **World vs screen coordinates** | Position on the infinite board vs. pixels in the window |
| **Affine transform** | Matrix combining scale/rotate/translate (`setTransform`) |
| **Viewport culling** | Skipping drawing of things outside the visible area |
| **Spatial index / hash** | Data structure for fast "what's near this point/box" queries |
| **Polyline** | A line made of connected straight segments |
| **Hit-testing** | Determining which object is under a point |
| **Ref (React)** | Mutable container that doesn't trigger re-renders |
| **External store** | State living outside React, subscribed via `useSyncExternalStore` |
| **Code splitting / lazy loading** | Splitting the bundle so code downloads only when needed |
| **CDN** | Content Delivery Network — cached file servers near users |
| **CNN / Conv1D** | Convolutional neural network; 1-D version slides filters along a sequence |
| **Softmax** | Turns raw scores into probabilities that sum to 1 |
| **Dropout** | Randomly disabling neurons during training to reduce overfitting |
| **Data augmentation** | Creating extra training samples by transforming existing ones |
| **Training/serving skew** | Bug where inference preprocesses data differently than training did |
| **CRDT** | Conflict-free Replicated Data Type — data structure that merges concurrent edits automatically |
| **OT** | Operational Transformation — the other classic approach to concurrent editing |
| **Last-write-wins** | Conflict policy where the latest save overwrites earlier ones |
| **Volatile message** | Socket.io message dropped (not queued) if it can't be delivered immediately |
| **Sticky sessions** | Load balancer keeps a client on the same server instance |
| **CI/CD** | Continuous Integration / Delivery — automatic build & deploy on push |
| **OIDC (in CI)** | GitHub proves its identity to Azure with a short-lived token instead of a stored password |
