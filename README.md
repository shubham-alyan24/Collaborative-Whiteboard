# Lienwand — Real-Time Collaborative Whiteboard

A real-time collaborative whiteboard where multiple people can draw, sketch and brainstorm on the same infinite canvas. A built-in ML model recognizes hand-drawn shapes and snaps them into clean geometry.

## **Live:** https://lienwand.vercel.app

## Features

- **Real-time collaboration**: several users draw on one board at the same time, with live cursors and presence indicators.
- **Drawing tools**: pen, eraser, select (move, resize or delete elements), shapes (rectangle, square, circle, triangle, diamond, line, arrow, star), text and images.
- **AI shape recognition**: draw a rough circle, square, triangle or line and hold still at the end. A CNN trained on Google QuickDraw replaces it with a clean shape.
- **Undo / redo**: history of the whole board (`Ctrl+Z` / `Ctrl+Y`), synced to collaborators.
- **Infinite canvas**: pan with the hand tool or by holding `Space`, pinch or scroll to zoom (0.5×–5×), and a minimap.
- **Board sharing**: share a board with a 6-character code. Visitors request access and the owner approves or denies it. Roles are `viewer` and `editor`.
- **Notifications**: in-app notifications for access requests and their results.
- **Authentication**: email/password with JWT, Google and GitHub OAuth, password reset by email.
- **Account settings**: change your profile and avatar, change your password, delete your account.
- **Persistence**: boards auto-save to MongoDB. Images and board thumbnails are stored on Cloudinary.
- **Dark mode**: theme toggle.

---

## Tech Stack

| Layer     | Tech                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| Frontend  | React 19, Vite, Tailwind CSS v4, shadcn/ui (Radix), Framer Motion, React Router, React Hook Form, Socket.io client |
| Backend   | Node.js, Express 5, Socket.io, MongoDB + Mongoose, JWT, express-validator, Multer, Cloudinary, Nodemailer          |
| ML server | Python, FastAPI, TensorFlow/Keras CNN, trained on Google QuickDraw (circle, square, triangle, line)                |
| Hosting   | Frontend on Vercel, backend on Azure Web App (GitHub Actions)                                                      |

---

## Architecture

```
┌──────────────┐  REST (save / load)   ┌─────────────────┐      ┌──────────┐
│   Frontend   │ ────────────────────▶ │     Backend     │ ───▶ │ MongoDB  │
│ React + Vite │ ◀──── Socket.io ────▶ │ Express + IO    │ ───▶ │Cloudinary│
└──────┬───────┘   (live relay)        └─────────────────┘      └──────────┘
       │ POST /api/recognize
       ▼
┌──────────────┐
│  ML server   │  FastAPI + Keras CNN
└──────────────┘
```

- **Saving uses REST only.** Edits are debounced (1s) and the full strokes array is sent with `PUT /api/whiteboards/:id`. A JPEG thumbnail is then uploaded.
- **Socket.io only relays events.** It forwards strokes, full-board syncs (erase, undo, redo), cursors and presence between clients, and never writes to the database. Sockets authenticate with a JWT, and viewers cannot broadcast edits.
- **Every element is a "stroke".** Pen lines, shapes, images and text are all stored in one `strokes` array on the board and told apart by `tool`.

---

## Project Structure

```
Whiteboard/
├── frontend/                 # React app (Vite), deployed to Vercel
│   └── src/
│       ├── api/              # fetch-based API clients (client.js + *.api.js)
│       ├── components/       # whiteboard/, landing/, home/, notifications/, ui/ …
│       ├── context/          # Auth, Socket, Theme, Toast providers
│       ├── hooks/            # useCanvas, useCamera, useHistory, useBoardSocket, …
│       ├── pages/            # Landing, Login, Home, WhiteboardPage, JoinBoard,
│       │                     # AccountSettings, ResetPassword, OAuthCallback
│       └── utils/            # shape recognizer, shape geometry, constants
├── backend/                  # Express + Socket.io server
│   ├── config/               # DB, Socket.io, Cloudinary
│   ├── controllers/          # auth, whiteboard, notification
│   ├── middleware/           # auth, validation, upload, errors
│   ├── models/               # User, Whiteboard, Notification
│   ├── routes/               # REST endpoints
│   ├── services/             # token, password, OAuth, email, share code, upload…
│   ├── socket/               # socket event handlers
│   └── utils/                # ApiError, catchAsync, constants
├── pythonServer/             # FastAPI ML inference server
│   ├── main.py               # POST /api/recognize
│   ├── preprocess.py         # stroke resampling & normalization
│   ├── train.py              # CNN training script
│   └── shape_model.keras     # trained model
└── Docs/                     # PRD, TRD and project notes
```

---

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm
- MongoDB (local or Atlas)
- Python 3.10+
- A Cloudinary account (for image uploads and thumbnails)
- Optional: SMTP credentials (password reset), Google/GitHub OAuth apps

### 1. Backend

```bash
cd backend
pnpm install
cp .env.example .env   # then fill it in
pnpm dev               # http://localhost:5000
```

`backend/.env`:

```env
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
# Allowed frontend origin(s), comma-separated; the first is used for OAuth redirects
CLIENT_URL=http://localhost:5173
# Public URL of this backend, used to build OAuth redirect URIs
SERVER_URL=http://localhost:5000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# SMTP for password reset emails (Gmail: smtp.gmail.com + an app password)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

OAuth callback URLs to register with the providers:
`{SERVER_URL}/api/auth/google/callback` and `{SERVER_URL}/api/auth/github/callback`.

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev               # http://localhost:5173
```

Optional `frontend/.env.local` (these are the default values):

```env
VITE_API_URL=http://localhost:5000
VITE_ML_API_URL=http://127.0.0.1:8000
```

Other scripts: `pnpm build`, `pnpm preview`, `pnpm lint`.

### 3. Python ML Server

```bash
cd pythonServer
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Set `FRONTEND_URL` (comma-separated) to change the allowed CORS origins.

> `shape_model.keras` is included in the repo. To retrain the model, put the QuickDraw `.ndjson` files in `pythonServer/dataset/` and run `python train.py`. `CATEGORIES` in `main.py` must use the same class order as `train.py`.

---

## API Overview

All routes are prefixed with `/api`. Every route except register, login, password reset and OAuth needs an `Authorization: Bearer <token>` header.

| Area          | Endpoints                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET/PATCH/DELETE /auth/me`, `PATCH /auth/me/password`, `GET /auth/:provider`, `GET /auth/:provider/callback`                                                 |
| Whiteboards   | `GET /whiteboards`, `POST /whiteboards`, `GET/PUT/DELETE /whiteboards/:id`, `GET /whiteboards/join/:code`, `POST /whiteboards/:id/request-access`, `POST /whiteboards/:id/respond-request`, `POST /whiteboards/:id/upload-image`, `POST /whiteboards/:id/thumbnail` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, `POST /notifications/:id/action`                                                                            |

**Socket events**: `join-board`, `leave-board`, `stroke-update`, `board-sync` and `cursor-move` are sent by the client. `presence-update` and `cursor-leave` are sent by the server.

---

## How Shape Recognition Works

1. You draw a stroke and hold the pointer still at the end.
2. The frontend sends the raw `[x, y]` points to `POST /api/recognize` on the ML server.
3. The server resamples the stroke to 64 points, normalizes its size, and passes it through a CNN trained on 10,000 QuickDraw samples per class.
4. If confidence is above 60%, it returns the shape type. The frontend then replaces your stroke with a clean shape that fits where you drew it.

---

## Deployment

- **Frontend**: Vercel. `vercel.json` rewrites all routes to the SPA.
- **Backend**: Azure Web App `lienwand-node`, deployed by `.github/workflows/main_lienwand-node.yml`.
- **ML server**: any host that can run FastAPI/Uvicorn. Point `VITE_ML_API_URL` at it.

---

## License

ISC
