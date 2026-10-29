# COLLOARD — Technical Requirements Document (TRD)

> **Real-Time Collaborative Whiteboard with AI/ML Features**

| Field                | Value                             |
| -------------------- | --------------------------------- |
| **Document Version** | 1.0                               |
| **Date**             | March 2025                        |
| **Status**           | Draft                             |
| **Classification**   | Internal / Engineering            |
| **Based on PRD**     | Colloard PRD v1.0 — February 2025 |
| **Language**         | JavaScript (Node.js + React)      |
| **Database**         | PostgreSQL                        |

---

## Table of Contents

1. [Introduction & Purpose](#1-introduction--purpose)
2. [System Architecture](#2-system-architecture)
3. [Frontend Technical Requirements](#3-frontend-technical-requirements)
4. [Backend Technical Requirements](#4-backend-technical-requirements)
5. [API Design](#5-api-design)
6. [Database Schema (PostgreSQL)](#6-database-schema-postgresql)
7. [ML/AI Technical Specifications](#7-mlai-technical-specifications)
8. [Performance Requirements](#8-performance-requirements)
9. [Security Requirements](#9-security-requirements)
10. [Infrastructure & DevOps](#10-infrastructure--devops)
11. [Testing Requirements](#11-testing-requirements)
12. [Error Handling & Observability](#12-error-handling--observability)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Open Technical Risks & Mitigations](#14-open-technical-risks--mitigations)
15. [Appendix A — JavaScript Interface Definitions (JSDoc)](#15-appendix-a--javascript-interface-definitions-jsdoc)
16. [Appendix B — Key Third-Party Services](#16-appendix-b--key-third-party-services)

---

## 1. Introduction & Purpose

### 1.1 Document Purpose

This Technical Requirements Document (TRD) translates the Colloard Product Requirements Document (PRD v1.0) into precise engineering specifications. It defines the system design, component interfaces, data models, API contracts, infrastructure needs, and testing requirements that engineering teams must follow to build and ship the Colloard platform.

All implementation is in **JavaScript** (not TypeScript). JSDoc annotations are used for documentation and IDE type hints. The primary database is **PostgreSQL** (replacing MongoDB) using the `pg` driver with `knex.js` as the query builder.

### 1.2 Scope

This document covers the complete Colloard system: the React 18 frontend, Node.js/Express backend, Socket.io real-time engine, PostgreSQL persistence layer, Redis caching layer, ML/AI feature integrations, infrastructure, and DevOps pipeline. It addresses all four PRD phases.

### 1.3 Definitions & Acronyms

| Term  | Expansion                          | Notes                             |
| ----- | ---------------------------------- | --------------------------------- |
| TRD   | Technical Requirements Document    | This document                     |
| PRD   | Product Requirements Document      | Colloard PRD v1.0 Feb 2025        |
| WSS   | WebSocket Secure                   | TLS-wrapped WebSocket transport   |
| OCR   | Optical Character Recognition      | Handwriting-to-text pipeline      |
| CNN   | Convolutional Neural Network       | Shape recognition model           |
| CI/CD | Continuous Integration / Delivery  | Automated build & deploy          |
| LRU   | Least Recently Used                | Cache eviction strategy           |
| CRDT  | Conflict-free Replicated Data Type | Conflict resolution approach      |
| JSDoc | JavaScript Documentation           | Used instead of TypeScript types  |
| ORM   | Object Relational Mapper           | knex.js (query builder) used here |
| CDN   | Content Delivery Network           | Edge-cached static assets         |
| DPR   | Device Pixel Ratio                 | HiDPI / Retina canvas scaling     |

### 1.4 Referenced Documents

- Colloard PRD v1.0 (February 2025)
- Socket.io v4 Documentation
- PostgreSQL 16 Documentation
- OWASP WebSocket Security Guidelines
- TensorFlow.js API Reference
- knex.js Query Builder Docs

---

## 2. System Architecture

### 2.1 High-Level Architecture

Colloard follows a three-tier client-server architecture augmented with a dedicated real-time messaging layer. The tiers are: (1) a React SPA frontend, (2) a dual-protocol Node.js backend serving both REST and WebSocket, and (3) a data tier comprising PostgreSQL, Redis, and AWS S3.

```
┌────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                          │
│   React 18 + JavaScript + Fabric.js + TensorFlow.js        │
│   Vite  │  Zustand  │  Socket.io-client  │  Tailwind CSS   │
└─────────────────┬──────────────────┬──────────────────────-┘
                  │ HTTPS / REST      │ WSS / Socket.io
┌─────────────────▼──────────────────▼─────────────────────-─┐
│                    APPLICATION LAYER                        │
│      Node.js 20 + Express 5 + Socket.io 4                  │
│   REST API  │  WS Engine  │  ML Proxy  │  Auth (JWT)       │
└──────┬───────────────────┬────────────────────┬─────────────┘
       │ knex.js / pg       │ ioredis             │ AWS S3 SDK
┌──────▼────────┐   ┌──────▼──────┐   ┌──────────▼──────────┐
│  PostgreSQL   │   │    Redis    │   │       AWS S3         │
│  (Primary DB) │   │  (Cache +   │   │  (Image / Asset      │
│               │   │   Pub/Sub)  │   │   Storage)           │
└───────────────┘   └─────────────┘   └─────────────────────-┘
```

### 2.2 Deployment Architecture

| Component        | Technology             | Hosting / Service                                   |
| ---------------- | ---------------------- | --------------------------------------------------- |
| Frontend SPA     | React 18 + Vite build  | AWS CloudFront + S3 (static hosting)                |
| API Server       | Node.js 20 + Express 5 | AWS ECS Fargate (auto-scaling)                      |
| WebSocket Server | Socket.io 4            | Collocated with API server; sticky sessions via ALB |
| Database         | PostgreSQL 16          | AWS RDS (Multi-AZ, db.t4g.medium+)                  |
| Cache / Pub-Sub  | Redis 7                | AWS ElastiCache for Redis                           |
| Object Storage   | AWS S3                 | us-east-1 bucket, private ACL                       |
| CDN              | AWS CloudFront         | Edge cache for static assets and S3 media           |
| DNS              | AWS Route 53           | colloard.io + api.colloard.io                       |

### 2.3 Technology Stack

#### 2.3.1 Frontend Stack

| Layer             | Technology       | Version | Rationale                        |
| ----------------- | ---------------- | ------- | -------------------------------- |
| Framework         | React            | 18.3+   | Concurrent rendering, Suspense   |
| Language          | JavaScript       | ES2022  | No compile step; JSDoc for types |
| Build Tool        | Vite             | 5.2+    | Fast HMR, ESM-first              |
| Styling           | Tailwind CSS     | 3.4+    | Utility-first, purge-safe        |
| Component Library | shadcn/ui        | Latest  | Accessible, composable           |
| Canvas Engine     | Fabric.js        | 6.x     | Object model over HTML5 Canvas   |
| State Management  | Zustand          | 4.5+    | Lightweight, devtools            |
| Real-time Client  | Socket.io-client | 4.7+    | Pairs with server engine         |
| ML (Client)       | TensorFlow.js    | 4.x     | Shape recognition in-browser     |
| OCR               | Tesseract.js     | 5.x     | Client-side handwriting OCR      |
| Testing           | Vitest + RTL     | Latest  | Fast unit + component tests      |

#### 2.3.2 Backend Stack

| Layer         | Technology         | Version | Rationale                             |
| ------------- | ------------------ | ------- | ------------------------------------- |
| Runtime       | Node.js            | 20 LTS  | V8 performance; even LTS              |
| Framework     | Express            | 5.0     | Minimal, async-native                 |
| WebSocket     | Socket.io          | 4.7+    | Rooms, namespaces, Redis adapter      |
| Query Builder | knex.js            | 3.x     | SQL query builder; migration support  |
| DB Driver     | pg (node-postgres) | 8.x     | Battle-tested PostgreSQL driver       |
| Cache Client  | ioredis            | 5.x     | Cluster-aware Redis client            |
| Storage SDK   | aws-sdk v3         | 3.x     | S3 + signed URL generation            |
| Validation    | Joi                | 17.x    | Runtime schema validation (JS-native) |
| Auth          | jsonwebtoken       | 9.x     | Stateless JWT for optional auth       |
| Testing       | Jest + Supertest   | Latest  | API integration tests                 |
| Process Mgmt  | PM2                | 5.x     | Cluster mode, zero-downtime restarts  |

---

## 3. Frontend Technical Requirements

### 3.1 Project Structure

```
src/
├── components/
│   ├── canvas/           # Fabric.js wrapper components
│   ├── toolbar/          # Drawing tools UI
│   ├── collaboration/    # Cursors, user list, presence
│   └── ui/               # shadcn/ui primitives
├── hooks/                # Custom React hooks
│   ├── useCanvas.js
│   ├── useSocket.js
│   └── useML.js
├── store/                # Zustand slices
│   ├── canvasStore.js
│   ├── collaborationStore.js
│   └── uiStore.js
├── services/             # API & socket service layers
│   ├── api.js
│   └── socket.js
├── ml/                   # ML model wrappers
│   ├── shapeRecognizer.js
│   └── ocrEngine.js
└── utils/                # Geometry, throttle, etc.
    ├── geometry.js
    └── throttle.js
```

> **Note:** No `tsconfig.json`. Use `jsconfig.json` with `"checkJs": true` and JSDoc annotations for IDE intellisense. ESLint with `eslint-plugin-jsdoc` enforces documentation coverage.

### 3.2 Canvas Engine Requirements

The drawing surface **MUST** be implemented using Fabric.js 6.x over HTML5 Canvas. Required configuration:

- **Canvas resolution:** DPR-aware — multiply canvas `width`/`height` by `window.devicePixelRatio` for crisp rendering on HiDPI/Retina displays.
- **Minimum canvas logical size:** 10,000 × 10,000 px (virtual infinite canvas via pan offsets).
- **Frame rate target:** 60 fps for pan/zoom operations; measure with `requestAnimationFrame` timestamps.
- **Stroke rendering:** use `fabric.PencilBrush` for freehand with decimate threshold of `2px` to reduce point count.
- **Layer isolation:** each user's strokes MUST render on a separate off-screen canvas layer, then composited to prevent full-redraw on every sync event.
- **Selection:** use Fabric.js `ActiveSelection` for multi-object selection; bounding box MUST reflect union of all selected objects.

### 3.3 Zustand State Slices

| Store Slice          | Key State Fields                                    | Responsibilities                                             |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| `canvasStore`        | `strokes[]`, `undoStack[]`, `redoStack[]`           | CRUD for canvas elements, undo/redo history (max 50 entries) |
| `collaborationStore` | `roomId`, `users[]`, `cursors{}`                    | Live user presence and cursor positions                      |
| `uiStore`            | `activeTool`, `color`, `strokeWidth`, `zoom`, `pan` | Toolbar and viewport state                                   |
| `mlStore`            | `isRecognizing`, `recognitionEnabled`, `ocrEnabled` | Async ML task status flags                                   |

### 3.4 WebSocket Client Requirements

- Initialize Socket.io client with `transports: ['websocket']` (disable polling fallback in production).
- Implement exponential back-off reconnection: initial delay 1 s, max delay 30 s, max retries 10.
- Throttle `cursor:move` emissions to one event per **16 ms** using `requestAnimationFrame`.
- Batch `stroke:move` points: buffer points every **50 ms** and emit as array (max 20 points per batch).
- On reconnect, emit `room:rejoin` with `roomId` to receive `room:state` resync from server.

### 3.5 Responsive Layout Requirements

| Breakpoint | Width       | Layout Adjustments                                                           |
| ---------- | ----------- | ---------------------------------------------------------------------------- |
| Desktop    | > 1024 px   | Left vertical toolbar (56 px), top header (52 px), bottom status bar (40 px) |
| Tablet     | 768–1024 px | Collapsible left toolbar (icon-only 40 px; expanded 200 px)                  |
| Mobile     | < 768 px    | Bottom horizontal toolbar; touch-optimized hit targets (min 44 × 44 px)      |

---

## 4. Backend Technical Requirements

### 4.1 Project Structure

```
src/
├── api/
│   ├── routes/           # Express routers (rooms.js, assets.js, health.js)
│   ├── controllers/      # Business logic handlers
│   └── middleware/       # Auth, rate-limit, validation (Joi)
├── socket/
│   ├── handlers/         # Per-event handler functions
│   └── middleware/       # Socket auth, room validation
├── db/
│   ├── knex.js           # knex instance + connection pool
│   ├── migrations/       # knex migration files
│   └── seeds/            # Dev seed data
├── services/             # DB / Redis / S3 abstractions
│   ├── roomService.js
│   ├── strokeService.js
│   └── storageService.js
├── ml/                   # ML proxy endpoint handlers
├── config/               # Env var validation (Joi)
└── utils/
```

### 4.2 knex.js Configuration

```js
// db/knex.js
const knex = require("knex")({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true }
        : false,
  },
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
  },
  migrations: {
    directory: "./src/db/migrations",
    tableName: "knex_migrations",
  },
});

module.exports = knex;
```

### 4.3 WebSocket Event Specification

#### 4.3.1 Client → Server Events

| Event            | Payload                              | Validation                               | Side Effects                                                                            |
| ---------------- | ------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `user:join`      | `{ roomId, userName, color? }`       | `roomId` exists; `userName` 1–32 chars   | Assign unique color if omitted; emit `user:joined` to room; emit `room:state` to socket |
| `user:leave`     | `{}`                                 | Socket must be in a room                 | Emit `user:left` to room; update presence in Redis                                      |
| `stroke:start`   | `{ strokeId, color, width, points }` | UUIDv4 `strokeId`; width 1–50; color hex | Store partial stroke in Redis key `stroke:{strokeId}`                                   |
| `stroke:move`    | `{ strokeId, points }`               | `strokeId` exists in Redis               | Append points to Redis list; broadcast to room                                          |
| `stroke:end`     | `{ strokeId, shapeType? }`           | `strokeId` in Redis                      | Persist stroke to PostgreSQL; delete Redis key; broadcast                               |
| `cursor:move`    | `{ x, y }`                           | `x`, `y` in range 0–100000               | Update Redis `cursor:{roomId}:{userId}`; broadcast `cursor:update`                      |
| `element:delete` | `{ elementIds[] }`                   | Max 100 IDs per call                     | Soft-delete in PostgreSQL; broadcast `element:deleted`                                  |
| `canvas:clear`   | `{}`                                 | Socket is room owner                     | Mark all strokes deleted in PostgreSQL; broadcast `canvas:cleared`                      |

#### 4.3.2 Server → Client Events

| Event             | Payload                        | Description                                                 |
| ----------------- | ------------------------------ | ----------------------------------------------------------- |
| `room:state`      | `{ room, strokes[], users[] }` | Sent to joining socket with full current state              |
| `stroke:update`   | `{ stroke }`                   | Broadcast to all room members except sender on `stroke:end` |
| `stroke:partial`  | `{ strokeId, points[] }`       | Broadcast during `stroke:move` for live preview             |
| `cursor:update`   | `{ userId, x, y }`             | Throttled cursor position broadcast (max 60/s per user)     |
| `user:joined`     | `{ user }`                     | Broadcast when a new user joins the room                    |
| `user:left`       | `{ userId }`                   | Broadcast when a user disconnects or leaves                 |
| `element:deleted` | `{ elementIds[] }`             | Broadcast after successful element deletion                 |
| `canvas:cleared`  | `{ clearedBy, timestamp }`     | Broadcast after canvas clear with actor info                |
| `error`           | `{ code, message }`            | Per-socket error events (not broadcast to room)             |

---

## 5. API Design

This section defines the complete REST API contract. All endpoints are prefixed with `/api/v1`. Requests and responses use `Content-Type: application/json`. Errors follow a unified error envelope.

### 5.1 Unified Response Envelope

#### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2025-03-01T12:00:00.000Z"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The requested room does not exist.",
    "details": []
  },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2025-03-01T12:00:00.000Z"
  }
}
```

### 5.2 Rooms API

#### `POST /api/v1/rooms` — Create Room

Creates a new whiteboard room.

**Request Body:**

```json
{
  "name": "Sprint Planning Q2",
  "isPublic": true,
  "maxUsers": 20,
  "password": null
}
```

| Field      | Type    | Required | Constraints                                  |
| ---------- | ------- | -------- | -------------------------------------------- |
| `name`     | string  | No       | 1–64 chars; defaults to `"Untitled Room"`    |
| `isPublic` | boolean | No       | Default: `true`                              |
| `maxUsers` | integer | No       | 2–50; default: 50                            |
| `password` | string  | No       | If provided, hashed with bcrypt (rounds: 12) |

**Response `201 Created`:**

```json
{
  "success": true,
  "data": {
    "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "joinCode": "XK92MZ",
    "shareUrl": "https://colloard.io/room/XK92MZ",
    "name": "Sprint Planning Q2",
    "settings": {
      "isPublic": true,
      "readOnly": false,
      "maxUsers": 20,
      "hasPassword": false
    },
    "createdAt": "2025-03-01T12:00:00.000Z"
  }
}
```

---

#### `GET /api/v1/rooms/:roomId` — Get Room Metadata

Returns lightweight room info (does not include strokes).

**Path Parameters:** `roomId` — UUID v4

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "roomId": "a1b2c3d4-...",
    "joinCode": "XK92MZ",
    "name": "Sprint Planning Q2",
    "userCount": 3,
    "maxUsers": 20,
    "isPublic": true,
    "readOnly": false,
    "hasPassword": false,
    "strokeCount": 142,
    "lastActiveAt": "2025-03-01T13:45:00.000Z",
    "createdAt": "2025-03-01T12:00:00.000Z"
  }
}
```

**Errors:** `404 ROOM_NOT_FOUND`

---

#### `GET /api/v1/rooms/:roomId/state` — Get Full Canvas State

Returns the full serialized canvas state including all active (non-deleted) strokes and currently connected users. Used when a new user joins.

**Headers:** `X-Room-Password: <password>` (if room is password-protected)

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "room": { "roomId": "...", "name": "...", "settings": {} },
    "strokes": [
      {
        "strokeId": "uuid",
        "type": "freehand",
        "points": [{ "x": 100, "y": 200 }, "..."],
        "color": "#3B82F6",
        "width": 4,
        "userId": "user-uuid",
        "timestamp": 1740830400000
      }
    ],
    "users": [
      {
        "userId": "user-uuid",
        "name": "Alice",
        "color": "#10B981",
        "cursorPosition": { "x": 450, "y": 320 },
        "isActive": true,
        "joinedAt": "2025-03-01T12:05:00.000Z"
      }
    ]
  }
}
```

**Errors:** `404 ROOM_NOT_FOUND`, `403 INVALID_PASSWORD`

---

#### `PATCH /api/v1/rooms/:roomId/settings` — Update Room Settings

**Headers:** `Authorization: Bearer <jwt>` (room owner only)

**Request Body:**

```json
{
  "name": "Updated Room Name",
  "isPublic": false,
  "readOnly": true,
  "maxUsers": 10
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "roomId": "...",
    "settings": {
      "isPublic": false,
      "readOnly": true,
      "maxUsers": 10
    },
    "updatedAt": "2025-03-01T14:00:00.000Z"
  }
}
```

**Errors:** `403 FORBIDDEN`, `404 ROOM_NOT_FOUND`

---

#### `DELETE /api/v1/rooms/:roomId` — Delete Room

Soft-deletes the room; schedules hard deletion after 7 days.

**Headers:** `Authorization: Bearer <jwt>` (room owner only)

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "roomId": "...",
    "deletedAt": "2025-03-01T14:30:00.000Z",
    "permanentDeleteAt": "2025-03-08T14:30:00.000Z"
  }
}
```

---

### 5.3 Strokes API

#### `GET /api/v1/rooms/:roomId/strokes` — List Strokes

Paginated fetch of all active strokes in a room (used for incremental sync on reconnect).

**Query Parameters:**

| Param    | Type    | Default | Description                                            |
| -------- | ------- | ------- | ------------------------------------------------------ |
| `since`  | integer | 0       | Unix ms timestamp; return only strokes after this time |
| `limit`  | integer | 500     | Max strokes to return; capped at 1000                  |
| `offset` | integer | 0       | Pagination offset                                      |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "strokes": ["..."],
    "total": 1423,
    "hasMore": true,
    "nextOffset": 500
  }
}
```

---

#### `DELETE /api/v1/rooms/:roomId/strokes` — Bulk Delete Strokes

**Request Body:**

```json
{
  "strokeIds": ["uuid-1", "uuid-2"]
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "deleted": 2,
    "strokeIds": ["uuid-1", "uuid-2"]
  }
}
```

**Errors:** `403 CANVAS_LOCKED` (readOnly room), `400 TOO_MANY_IDS` (> 100)

---

### 5.4 Assets API

#### `POST /api/v1/assets/upload` — Upload Image

Accepts multipart/form-data. Validates MIME type and re-encodes with Sharp.

**Request:** `multipart/form-data`

| Field    | Type   | Constraints                    |
| -------- | ------ | ------------------------------ |
| `file`   | File   | JPEG, PNG, GIF, WebP; max 5 MB |
| `roomId` | string | Must be a valid active room    |

**Response `201 Created`:**

```json
{
  "success": true,
  "data": {
    "assetId": "uuid",
    "url": "https://cdn.colloard.io/assets/uuid.png",
    "mimeType": "image/png",
    "width": 1200,
    "height": 800,
    "sizeBytes": 204800,
    "expiresAt": null
  }
}
```

**Errors:** `413 UPLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `429 RATE_LIMITED`

---

#### `POST /api/v1/assets/remove-bg` — Remove Image Background

**Request Body:**

```json
{
  "imageUrl": "https://cdn.colloard.io/assets/uuid.png",
  "roomId": "room-uuid"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "assetId": "new-uuid",
    "url": "https://cdn.colloard.io/assets/new-uuid-nobg.png",
    "processingMs": 1420
  }
}
```

**Errors:** `504 ML_TIMEOUT`, `429 RATE_LIMITED`

---

#### `POST /api/v1/assets/sketch-to-image` — Generate Image from Sketch

**Request Body:**

```json
{
  "sketchBase64": "data:image/png;base64,...",
  "prompt": "a modern office building",
  "style": "realistic",
  "roomId": "room-uuid"
}
```

| Field          | Type   | Required | Notes                                                  |
| -------------- | ------ | -------- | ------------------------------------------------------ |
| `sketchBase64` | string | Yes      | Base64-encoded PNG of the sketch selection             |
| `prompt`       | string | Yes      | 1–500 chars; sanitized before API call                 |
| `style`        | string | No       | `"realistic"`, `"cartoon"`, `"sketch"`, `"watercolor"` |
| `roomId`       | string | Yes      | For quota enforcement                                  |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "assetId": "uuid",
    "url": "https://cdn.colloard.io/assets/generated-uuid.png",
    "provider": "openai",
    "processingMs": 3200,
    "dailyQuotaRemaining": 7
  }
}
```

**Errors:** `429 QUOTA_EXCEEDED`, `504 ML_TIMEOUT`, `400 PROMPT_REJECTED`

---

### 5.5 Export API

#### `GET /api/v1/rooms/:roomId/export/png` — Export as PNG

**Query Parameters:** `width` (default: 1920), `height` (default: 1080), `background` (default: `"white"`)

**Response `200 OK`:** `Content-Type: image/png` — binary PNG stream

---

#### `GET /api/v1/rooms/:roomId/export/pdf` — Export as PDF

**Response `200 OK`:** `Content-Type: application/pdf` — binary PDF stream

---

#### `GET /api/v1/rooms/:roomId/export/json` — Export as JSON

Returns a portable JSON snapshot of the full room state for re-import.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "exportVersion": "1.0",
    "exportedAt": "2025-03-01T14:00:00.000Z",
    "room": { "name": "Sprint Planning Q2" },
    "strokes": ["..."]
  }
}
```

---

### 5.6 Health & Status API

#### `GET /healthz` — Liveness Probe

Used by ECS / load balancer. Returns `200` if the process is alive.

```json
{ "status": "ok", "uptime": 86400 }
```

#### `GET /readyz` — Readiness Probe

Returns `200` only if database and Redis connections are healthy.

```json
{
  "status": "ready",
  "checks": {
    "postgres": "ok",
    "redis": "ok"
  }
}
```

---

### 5.7 HTTP Status Code Reference

| Code                         | Used For                                            |
| ---------------------------- | --------------------------------------------------- |
| `200 OK`                     | Successful GET, PATCH, DELETE                       |
| `201 Created`                | Successful POST that creates a resource             |
| `400 Bad Request`            | Validation failure (Joi schema error)               |
| `401 Unauthorized`           | Missing or invalid JWT                              |
| `403 Forbidden`              | Valid JWT but insufficient permissions              |
| `404 Not Found`              | Resource does not exist                             |
| `409 Conflict`               | Duplicate resource (e.g., room join code collision) |
| `413 Payload Too Large`      | File upload exceeds 5 MB                            |
| `415 Unsupported Media Type` | Non-image MIME type uploaded                        |
| `429 Too Many Requests`      | Rate limit exceeded                                 |
| `500 Internal Server Error`  | Unhandled server error                              |
| `504 Gateway Timeout`        | ML proxy did not respond within SLA                 |

---

## 6. Database Schema (PostgreSQL)

### 6.1 Schema Overview

All tables live in the `colloard` schema. Migrations are managed with `knex.js` migration files under `src/db/migrations/`.

```sql
CREATE SCHEMA IF NOT EXISTS colloard;
SET search_path TO colloard;
```

### 6.2 Tables

#### `rooms` Table

```sql
CREATE TABLE rooms (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID          UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  join_code     CHAR(6)       UNIQUE NOT NULL,
  name          VARCHAR(64)   NOT NULL DEFAULT 'Untitled Room',
  owner_id      VARCHAR(255),
  is_public     BOOLEAN       NOT NULL DEFAULT TRUE,
  read_only     BOOLEAN       NOT NULL DEFAULT FALSE,
  max_users     SMALLINT      NOT NULL DEFAULT 50 CHECK (max_users BETWEEN 2 AND 50),
  password_hash VARCHAR(72),
  stroke_count  INTEGER       NOT NULL DEFAULT 0,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_room_id      ON rooms(room_id);
CREATE INDEX idx_rooms_join_code    ON rooms(join_code);
CREATE INDEX idx_rooms_expires_at   ON rooms(expires_at) WHERE is_deleted = FALSE;
CREATE INDEX idx_rooms_last_active  ON rooms(last_active_at DESC);
```

#### `strokes` Table

```sql
CREATE TABLE strokes (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  stroke_id     UUID          UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  room_id       UUID          NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  type          VARCHAR(16)   NOT NULL CHECK (type IN ('freehand','shape','text','image','sticky')),
  points        JSONB         NOT NULL DEFAULT '[]',
  color         CHAR(7)       NOT NULL DEFAULT '#000000',
  width         SMALLINT      NOT NULL DEFAULT 2 CHECK (width BETWEEN 1 AND 50),
  user_id       VARCHAR(255)  NOT NULL,
  shape_type    VARCHAR(16)   CHECK (shape_type IN ('circle','rectangle','line','arrow','triangle','star')),
  bounding_box  JSONB,
  text_content  TEXT,
  font_size     SMALLINT,
  font_family   VARCHAR(64),
  image_url     TEXT,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  timestamp     BIGINT        NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX idx_strokes_room_id       ON strokes(room_id, is_deleted, timestamp);
CREATE INDEX idx_strokes_stroke_id     ON strokes(stroke_id);
CREATE INDEX idx_strokes_room_user     ON strokes(room_id, user_id);
CREATE INDEX idx_strokes_room_created  ON strokes(room_id, created_at DESC) WHERE is_deleted = FALSE;
-- GIN index for fast JSONB bounding box queries
CREATE INDEX idx_strokes_bounding_box  ON strokes USING GIN (bounding_box);
```

#### `users` Table

```sql
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(255)  UNIQUE NOT NULL,
  name          VARCHAR(64)   NOT NULL,
  avatar_url    TEXT,
  email         VARCHAR(255)  UNIQUE,
  password_hash VARCHAR(72),
  is_guest      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_email   ON users(email) WHERE email IS NOT NULL;
```

#### `room_members` Table

```sql
CREATE TABLE room_members (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID          NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  user_id       VARCHAR(255)  NOT NULL,
  color         CHAR(7)       NOT NULL,
  role          VARCHAR(16)   NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member','viewer')),
  joined_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
```

#### `assets` Table

```sql
CREATE TABLE assets (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID          UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  room_id       UUID          REFERENCES rooms(room_id) ON DELETE SET NULL,
  uploader_id   VARCHAR(255),
  s3_key        TEXT          NOT NULL,
  cdn_url       TEXT          NOT NULL,
  mime_type     VARCHAR(64)   NOT NULL,
  width_px      INTEGER,
  height_px     INTEGER,
  size_bytes    INTEGER       NOT NULL,
  asset_type    VARCHAR(16)   NOT NULL CHECK (asset_type IN ('upload','generated','nobg')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_room_id  ON assets(room_id);
CREATE INDEX idx_assets_asset_id ON assets(asset_id);
```

### 6.3 Database Migrations (knex.js)

```js
// src/db/migrations/001_create_rooms.js
exports.up = async (knex) => {
  await knex.schema.withSchema("colloard").createTable("rooms", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("room_id")
      .unique()
      .notNullable()
      .defaultTo(knex.raw("gen_random_uuid()"));
    table.specificType("join_code", "CHAR(6)").unique().notNullable();
    table.string("name", 64).notNullable().defaultTo("Untitled Room");
    table.string("owner_id", 255);
    table.boolean("is_public").notNullable().defaultTo(true);
    table.boolean("read_only").notNullable().defaultTo(false);
    table.integer("max_users").notNullable().defaultTo(50);
    table.string("password_hash", 72);
    table.integer("stroke_count").notNullable().defaultTo(0);
    table.boolean("is_deleted").notNullable().defaultTo(false);
    table.timestamp("deleted_at", { useTz: true });
    table
      .timestamp("last_active_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("expires_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.raw("NOW() + INTERVAL '30 days'"));
    table.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.withSchema("colloard").dropTableIfExists("rooms");
};
```

### 6.4 Redis Data Structures

| Key Pattern              | Type                                  | Purpose & TTL                                         |
| ------------------------ | ------------------------------------- | ----------------------------------------------------- |
| `room:{roomId}:users`    | Hash                                  | Active user metadata (color, name). TTL: 24 h rolling |
| `room:{roomId}:cursors`  | Hash (field=userId, value=JSON {x,y}) | Live cursor positions. TTL: 5 min rolling             |
| `stroke:{strokeId}`      | List                                  | In-flight stroke points during active draw. TTL: 60 s |
| `room:{roomId}:presence` | Set                                   | Set of active socketIds. TTL: 24 h rolling            |
| `ratelimit:{ip}`         | String (counter)                      | Sliding window rate limit counter. TTL: 60 s          |
| `session:{userId}`       | Hash                                  | Optional user session data. TTL: 7 days               |

---

## 7. ML/AI Technical Specifications

### 7.1 Shape Recognition

#### 7.1.1 Architecture Decision

Two approaches are specified. Implementation MUST start with the $1 Unistroke Recognizer and graduate to CNN if accuracy targets are not met.

| Approach                | Library / Model                  | When to Use                                    |
| ----------------------- | -------------------------------- | ---------------------------------------------- |
| $1 Unistroke Recognizer | `dollarjs` (client-side, ~12 KB) | MVP — Phase 1 & 2; no model loading latency    |
| CNN Shape Classifier    | TensorFlow.js + custom model     | Phase 3 if $1 accuracy < 85% on user test data |

#### 7.1.2 Shape Recognition Pipeline

1. Capture stroke points on `stroke:end` event.
2. Normalize point array: resample to 64 equidistant points, scale to 250×250 bounding box, translate centroid to origin.
3. Run $1 Recognizer: compare against template library (circle, rectangle, triangle, line, arrow, star).
4. If confidence score > **0.85**, trigger morph animation and replace freehand stroke with perfect geometric shape.
5. If confidence < **0.85**, retain original freehand stroke; do not auto-correct.
6. Emit `shape:recognized` event with `{ strokeId, shapeType, confidence }` for telemetry.

**Performance:** Recognition MUST complete within **30 ms** on a mid-range device. Model/template loading MUST be deferred via dynamic `import()`.

### 7.2 Handwriting OCR (Tesseract.js)

- Use Tesseract.js v5 with LSTM engine (WASM build).
- Initialize worker once at app startup; reuse across OCR requests.
- Input preprocessing: export selected canvas region as PNG at 2× DPR; apply binarization filter (threshold = 128) before passing to Tesseract.
- Output: raw text string + bounding boxes per word (`hocr` format for layout preservation).
- Timeout: abort OCR if not resolved within **10 s**; surface error with retry option.

### 7.3 Sketch-to-Image (Generative AI)

The sketch-to-image feature proxies through the Colloard backend. Backend supports two providers, switchable via `AI_PROVIDER` environment variable.

| Provider                | Model / Endpoint                       | Configuration                                                                |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| OpenAI (default)        | DALL-E 3 — POST /v1/images/generations | `prompt: user_prompt + style_prefix`; `size: 1024x1024`; `quality: standard` |
| Stability AI (fallback) | stable-diffusion-xl-1024-v1-0 img2img  | `cfg_scale: 7`; `steps: 30`; `strength: 0.65`; `seed: random`                |

The proxy endpoint MUST implement: request queuing (max 3 concurrent), 30 s timeout, cost guard (max 10 generations per room per day), and prompt sanitization via content moderation pre-check.

### 7.4 Background Removal

- **Primary:** remove.bg REST API (`POST https://api.remove.bg/v1.0/removebg`)
- **Fallback:** U2Net model via TensorFlow.js client-side (model ~176 MB, lazy-loaded on first use)
- Maximum input: 5 MB
- Output: PNG with alpha channel; stored in S3 alongside original
- SLA: < 3 s for remove.bg path; < 10 s for U2Net client path

---

## 8. Performance Requirements

### 8.1 Performance Targets

| Metric                            | Target                      | Measurement Method                            |
| --------------------------------- | --------------------------- | --------------------------------------------- |
| Initial page load (LCP)           | < 2.0 s on 4G (10 Mbps)     | Lighthouse CI in GitHub Actions               |
| Time to Interactive (TTI)         | < 3.0 s on mid-range device | Lighthouse CI                                 |
| Stroke render latency (local)     | < 16 ms (1 frame @ 60 fps)  | `performance.now()` delta in `useCanvas` hook |
| Stroke sync latency (same region) | < 50 ms RTT (P95)           | Socket.io latency events                      |
| Cursor sync latency               | < 100 ms RTT (P95)          | Socket.io latency events                      |
| Pan/Zoom frame rate               | 60 fps sustained            | Chrome DevTools Frame Rendering Stats         |
| Shape recognition latency         | < 30 ms                     | `performance.mark/measure` around recognizer  |
| Concurrent users per room         | 50 users                    | k6 WebSocket load test                        |
| API response time (P99)           | < 200 ms (non-ML endpoints) | AWS CloudWatch custom metrics                 |
| Canvas with 10,000 strokes        | < 100 ms re-render          | Bench with Fabric.js serialization            |

### 8.2 Frontend Optimization Strategies

**Canvas Layering:** Three-layer architecture:

- **Layer 0 — Background:** static grid lines; rendered once, never invalidated.
- **Layer 1 — Committed Strokes:** all finalized strokes; redrawn only on undo/redo or delete.
- **Layer 2 — Active Drawing:** current user's in-progress stroke and remote partial strokes; cleared and redrawn every frame.

**Stroke Point Simplification:** Apply Ramer-Douglas-Peucker (RDP) algorithm with epsilon = 1.5 px on `stroke:end` before persisting to PostgreSQL. Target: 70% point reduction without perceptible quality loss.

**Virtual Rendering:** Implement frustum culling — only render strokes whose bounding boxes intersect the current viewport. Use `rbush` (R-tree) spatial index to efficiently query visible strokes.

### 8.3 Backend Optimization Strategies

- **Socket.io Redis Adapter:** use `@socket.io/redis-adapter` with `ioredis` for multi-instance pub/sub. Required for horizontal scaling.
- **Cursor throttling:** server-side rate limiting for `cursor:update` broadcasts — max 60 broadcasts per user per second.
- **Stroke batching:** accumulate `stroke:move` point arrays; broadcast in batches every 16 ms.
- **PostgreSQL connection pooling:** `knex.js` pool `min: 2`, `max: 20`; monitor with `pg_stat_activity`.
- **Redis pipeline:** batch Redis reads on `room:state` fetch using `multi()` to minimize round trips.
- **PostgreSQL query optimization:** use `EXPLAIN ANALYZE` on all queries during development; add indexes for any query taking > 10 ms.

---

## 9. Security Requirements

### 9.1 Transport Security

- All HTTP endpoints MUST use HTTPS/TLS 1.3. Redirect HTTP → HTTPS with `301`.
- WebSocket MUST use WSS (TLS-wrapped). Reject `ws://` connections in production.
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- CORS policy: allow only `https://colloard.io` and `https://www.colloard.io`. No wildcard origins.

### 9.2 Input Validation

- All incoming WebSocket payloads MUST be validated against Joi schemas before processing.
- REST request bodies validated via Joi; return `400` with structured error on failure.
- Canvas text content: sanitize with DOMPurify before rendering (prevent stored XSS).
- Image uploads: validate `Content-Type` header AND magic bytes (not just file extension).
- Image uploads: re-encode with Sharp before storage to strip EXIF data and prevent polyglot file attacks.
- SQL injection: all database queries MUST use knex.js parameterized bindings. Raw SQL with user input is forbidden.

### 9.3 Rate Limiting

| Scope                         | Limit        | Window     |
| ----------------------------- | ------------ | ---------- |
| REST API (per IP)             | 100 requests | 60 seconds |
| Room creation (per IP)        | 5 rooms      | 60 seconds |
| Image uploads (per room)      | 20 files     | 60 seconds |
| ML endpoints (per room)       | 10 requests  | 60 seconds |
| WebSocket events (per socket) | 500 events   | 60 seconds |

Implement rate limiting using a Redis sliding window counter. Return HTTP `429` or Socket.io `error` event with `Retry-After` header when limit exceeded.

### 9.4 Room Access Control

- Room IDs MUST be UUIDv4 (128-bit entropy). Do NOT use sequential IDs.
- Join codes: 6-character alphanumeric (case-insensitive), generated with `crypto.randomBytes`.
- Optional room passwords: store as bcrypt hash (rounds: 12). Never log or transmit plaintext passwords.
- Read-only enforcement: server MUST check `read_only` before processing any mutating WebSocket event. Client-side enforcement alone is insufficient.

---

## 10. Infrastructure & DevOps

### 10.1 Containerization

- **Frontend:** multi-stage Dockerfile — Stage 1: `node:20-alpine` build; Stage 2: `nginx:alpine` serve.
- **Backend:** `node:20-alpine` base; non-root user (uid 1001); health check on `GET /healthz`.
- All images MUST pass Trivy vulnerability scan (zero critical CVEs) before deployment.
- Docker Compose provided for local development with PostgreSQL, Redis, and both app services.

### 10.2 CI/CD Pipeline (GitHub Actions)

| Stage             | Trigger                         | Steps                                                            |
| ----------------- | ------------------------------- | ---------------------------------------------------------------- |
| PR Validation     | Pull Request to `main`          | ESLint, JSDoc lint, unit tests, `npm audit`                      |
| Build             | Merge to `main`                 | Docker build, Trivy scan, push to ECR with git SHA tag           |
| DB Migrations     | Merge to `main` (before deploy) | `knex migrate:latest` on staging DB                              |
| Deploy Staging    | Merge to `main`                 | ECS rolling deploy; run Lighthouse CI; run k6 smoke test         |
| Deploy Production | Manual approval                 | ECS blue/green deploy; CloudFront cache invalidation; smoke test |
| Rollback          | Automated on health check fail  | Revert to previous ECS task definition revision                  |

### 10.3 Environment Variables

| Variable            | Example Value                               | Required In        |
| ------------------- | ------------------------------------------- | ------------------ |
| `NODE_ENV`          | `production`                                | All                |
| `PORT`              | `3001`                                      | Backend            |
| `DATABASE_URL`      | `postgresql://user:pass@host:5432/colloard` | Backend            |
| `REDIS_URL`         | `rediss://...`                              | Backend            |
| `AWS_REGION`        | `us-east-1`                                 | Backend            |
| `S3_BUCKET_NAME`    | `colloard-assets-prod`                      | Backend            |
| `JWT_SECRET`        | 256-bit random hex                          | Backend            |
| `REMOVE_BG_API_KEY` | `...`                                       | Backend            |
| `OPENAI_API_KEY`    | `sk-...`                                    | Backend            |
| `STABILITY_API_KEY` | `sk-...`                                    | Backend (fallback) |
| `AI_PROVIDER`       | `openai`                                    | Backend            |
| `VITE_API_BASE_URL` | `https://api.colloard.io`                   | Frontend build     |
| `VITE_WS_URL`       | `wss://api.colloard.io`                     | Frontend build     |

All secrets MUST be stored in **AWS Secrets Manager** and injected at container startup. Never commit secrets to the repository.

---

## 11. Testing Requirements

### 11.1 Testing Pyramid

| Level                   | Coverage Target                                                  | Tooling                                   |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Unit Tests              | 80% line coverage (business logic, utils, stores)                | Vitest + `@testing-library/react`         |
| Integration Tests (API) | All REST endpoints; all WebSocket event handlers                 | Jest + Supertest + `pg` test DB           |
| Component Tests         | All toolbar, canvas, and collaboration UI components             | Vitest + `@testing-library/react` + jsdom |
| E2E Tests               | Critical flows: create room, draw stroke, real-time sync, export | Playwright                                |
| Load Tests              | 50 concurrent WebSocket users per room; 100 rps REST             | k6                                        |
| Accessibility           | WCAG 2.1 AA for all UI components                                | axe-core + Playwright                     |

### 11.2 Critical Test Scenarios

**Real-Time Sync:**

1. User A joins room. User B joins same room. User A draws a stroke. Assert: User B receives `stroke:update` within 200 ms.
2. Simulate network partition for User A (500 ms). Assert: stroke buffered. Assert: on reconnect, canvas state is consistent between A and B.
3. 50 users join same room simultaneously. Assert: all receive `room:state` within 2 s.

**ML Features:**

1. Draw a circle stroke. Assert: `shapeType === 'circle'` returned with `confidence > 0.85`.
2. Draw an ambiguous stroke (confidence < 0.85). Assert: original freehand stroke retained.
3. Upload image with background. Assert: background removal returns PNG with alpha channel within 5 s.

**Database:**

1. Insert 10,000 strokes for one room. Assert: `GET /api/v1/rooms/:roomId/state` responds within 500 ms.
2. Simulate PostgreSQL failover (stop primary). Assert: knex reconnects to replica within 30 s without data loss.

### 11.3 Performance Test Thresholds (k6)

```js
export const options = {
  thresholds: {
    ws_session_duration: ["p(95)<3000"], // join + draw + leave < 3s
    ws_msgs_sent: ["rate>0.99"], // 99%+ delivery
    http_req_duration: ["p(99)<200"], // REST API P99 < 200ms
    http_req_failed: ["rate<0.01"], // < 1% error rate
  },
};
```

---

## 12. Error Handling & Observability

### 12.1 Error Codes

| Code               | HTTP / WS         | Meaning                           | Client Action               |
| ------------------ | ----------------- | --------------------------------- | --------------------------- |
| `ROOM_NOT_FOUND`   | 404 / error event | Requested `roomId` does not exist | Redirect to landing page    |
| `ROOM_FULL`        | 403 / error event | Room at `maxUsers` capacity       | Show 'Room full' modal      |
| `RATE_LIMITED`     | 429 / error event | Too many requests                 | Show retry countdown        |
| `INVALID_PAYLOAD`  | 400 / error event | Joi validation failure            | Log to Sentry; silent retry |
| `CANVAS_LOCKED`    | 403 / error event | Room in `readOnly` mode           | Show 'View only' indicator  |
| `ML_TIMEOUT`       | 504 / error event | ML operation exceeded timeout     | Show retry button           |
| `UPLOAD_TOO_LARGE` | 413 / error event | File exceeds 5 MB limit           | Show file size error        |
| `INVALID_PASSWORD` | 403 / error event | Incorrect room password           | Prompt re-entry             |
| `QUOTA_EXCEEDED`   | 429 / error event | Daily generation quota reached    | Show quota info             |
| `PROMPT_REJECTED`  | 400 / error event | Content moderation block          | Prompt user to revise       |

### 12.2 Observability Stack

| Signal              | Tool                               | Key Metrics / Logs                                                  |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Metrics             | AWS CloudWatch + custom namespace  | WebSocket connections, events/s, stroke sync latency P50/P95/P99    |
| Error Tracking      | Sentry (frontend + backend)        | JS exceptions, unhandled rejections, source maps                    |
| Structured Logging  | Winston + CloudWatch Logs Insights | JSON logs with `traceId`, `roomId`, `userId`, `event`, `durationMs` |
| Uptime Monitoring   | AWS CloudWatch Synthetics          | Canary on `/healthz` every 60 s; page load smoke every 5 min        |
| Distributed Tracing | AWS X-Ray                          | Trace HTTP → WS → PostgreSQL → Redis across services                |

---

## 13. Implementation Roadmap

### Phase 1: MVP (Weeks 1–6)

| Week | Deliverables                                                                                                               | Acceptance Criteria                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1–2  | Project scaffolding, Vite + React JS setup, Express + Socket.io boilerplate, PostgreSQL + Redis local dev, knex migrations | `npm run dev` starts both services; WebSocket handshake successful; migrations run clean |
| 2–3  | Fabric.js canvas integration, freehand pen, eraser, color picker, stroke width slider                                      | Can draw/erase locally; strokes serializable to stroke object shape                      |
| 3–4  | WebSocket real-time sync: `stroke:start/move/end`, `cursor:move`, `user:join/leave`                                        | Two browser tabs show live cursors and strokes within 50 ms                              |
| 4–5  | Room creation + join via URL/code; undo/redo (50-step stack); canvas clear                                                 | Share link opens room with existing strokes intact                                       |
| 5–6  | Export as PNG; user presence UI; staging deployment; Lighthouse CI                                                         | Lighthouse score ≥ 85; PNG export correct; all P0 features pass QA                       |

### Phase 2: Enhanced Features (Weeks 7–10)

| Week | Deliverables                                                      | Acceptance Criteria                                                           |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 7    | Basic shapes (rect, circle, line, arrow), text tool, sticky notes | Shapes render with correct bounding boxes; text tool is in-canvas editable    |
| 8    | Shape Recognition ($1 Recognizer), image upload + S3 storage      | Circle drawn → perfect circle in ≤ 200 ms; image appears on canvas within 2 s |
| 9    | Persistent rooms (PostgreSQL), mobile responsive layout           | Room survives server restart; mobile toolbar renders at 375 px                |
| 10   | Conflict resolution (last-write-wins), room settings API          | Simultaneous edits by 3 users produce consistent canvas state                 |

### Phase 3: AI/ML Features (Weeks 11–14)

| Week | Deliverables                                                          | Acceptance Criteria                                                                 |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 11   | Handwriting OCR (Tesseract.js), smart lasso selection                 | Legible handwriting converts to text ≥ 85% accuracy; lasso selects correct elements |
| 12   | Sketch-to-Image (DALL-E proxy), background removal (remove.bg proxy)  | Image generated in < 5 s; background removed in < 3 s                               |
| 13   | PDF export, JSON export/import                                        | PDF renders all elements; JSON round-trips without data loss                        |
| 14   | Performance optimization (R-tree, RDP, canvas layering), load testing | k6 load test passes all thresholds at 50 concurrent users                           |

---

## 14. Open Technical Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                                                                                             |
| ------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Canvas performance degrades with 10,000+ strokes  | High       | High   | Implement R-tree frustum culling and RDP stroke simplification in Phase 2. Benchmark early in development.             |
| Socket.io cannot scale beyond single Node process | Medium     | High   | Integrate `@socket.io/redis-adapter` from Day 1. Load test horizontal scaling in staging before Phase 3.               |
| Tesseract.js WASM bundle (> 6 MB) slows TTI       | Medium     | Medium | Lazy-load Tesseract worker on first OCR request only. Measure TTI impact; consider server-side Google Vision fallback. |
| $1 Recognizer accuracy below 85% on user data     | Medium     | Medium | Collect anonymized stroke telemetry in Phase 2. If accuracy miss confirmed, train lightweight CNN with TensorFlow.js.  |
| DALL-E API cost spikes from abuse                 | Low        | High   | Enforce per-room daily quota (10 generations/day), request queue, and content moderation pre-check on every call.      |
| PostgreSQL N+1 queries on large canvas state      | Medium     | Medium | Use knex.js `whereIn` bulk fetches; profile with `pg_stat_statements`; add `EXPLAIN ANALYZE` to CI query tests.        |
| Browser Canvas API inconsistencies (Safari)       | Medium     | Medium | Automated Playwright cross-browser tests on Chrome, Firefox, Safari WebKit. Fabric.js handles most inconsistencies.    |

---

## 15. Appendix A — JavaScript Interface Definitions (JSDoc)

```js
/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {Object} Stroke
 * @property {string} strokeId          - UUID v4
 * @property {string} roomId            - UUID v4
 * @property {'freehand'|'shape'|'text'|'image'|'sticky'} type
 * @property {Point[]} points
 * @property {string} color             - #RRGGBB hex
 * @property {number} width             - 1–50
 * @property {string} userId
 * @property {number} timestamp         - Unix milliseconds
 * @property {'circle'|'rectangle'|'line'|'arrow'|'triangle'|'star'} [shapeType]
 * @property {BoundingBox} [boundingBox]
 * @property {string} [textContent]
 * @property {number} [fontSize]
 * @property {string} [fontFamily]
 * @property {string} [imageUrl]
 */

/**
 * @typedef {Object} User
 * @property {string} userId
 * @property {string} name
 * @property {string} [avatarUrl]
 * @property {string} color             - Hex cursor color
 * @property {Point} cursorPosition
 * @property {boolean} isActive
 * @property {Date} joinedAt
 */

/**
 * @typedef {Object} RoomSettings
 * @property {boolean} isPublic
 * @property {boolean} readOnly
 * @property {number} maxUsers
 * @property {boolean} hasPassword
 */

/**
 * @typedef {Object} Room
 * @property {string} roomId
 * @property {string} joinCode
 * @property {string} name
 * @property {string} [ownerId]
 * @property {RoomSettings} settings
 * @property {number} strokeCount
 * @property {Date} lastActiveAt
 * @property {Date} expiresAt
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {*} data
 * @property {{ requestId: string, timestamp: string }} meta
 */

/**
 * @typedef {Object} ApiError
 * @property {boolean} success
 * @property {{ code: string, message: string, details: Array }} error
 * @property {{ requestId: string, timestamp: string }} meta
 */
```

---

## 16. Appendix B — Key Third-Party Services

| Service               | Use Case                            | Fallback                                          |
| --------------------- | ----------------------------------- | ------------------------------------------------- |
| AWS RDS PostgreSQL 16 | Primary relational database         | Local PostgreSQL 16 (Docker) for dev/staging      |
| AWS S3                | Image asset storage                 | MinIO (self-hosted) for local dev                 |
| AWS ElastiCache       | Redis (session + pub/sub)           | Local Redis (Docker) for dev only                 |
| remove.bg API         | Background removal (primary)        | U2Net via TensorFlow.js (client-side)             |
| OpenAI DALL-E 3       | Sketch-to-image generation          | Stability AI SDXL (via `AI_PROVIDER` env flag)    |
| Sentry                | Error tracking (frontend + backend) | Structured CloudWatch logs                        |
| AWS CloudFront        | CDN for static assets and S3 media  | Direct S3 origin (degraded performance)           |
| Tesseract.js          | Client-side handwriting OCR         | Google Vision API (server-side, Phase 3 fallback) |
