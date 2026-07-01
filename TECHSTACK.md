# LocShare — Tech Stack

## Backend

| What | Detail |
|------|--------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jsonwebtoken`) + password hashing (`bcryptjs`) |
| IDs | `uuid` for all primary keys |
| CORS | `cors` middleware |
| Port | `3847` (dev) / `8080` (Docker/production) |

## Frontend

| What | Detail |
|------|--------|
| Language | Vanilla HTML + CSS + JavaScript (no framework) |
| Map library | **Leaflet.js v1.9.4** |
| Map tiles | **OpenStreetMap** (free, no API key needed) |
| Reverse geocoding | **Nominatim** (`nominatim.openstreetmap.org`) — converts lat/lng to address |
| GPS | Browser `navigator.geolocation` API |
| PWA | `manifest.json` + Service Worker (`sw.js`) |

## Map details

- **Leaflet.js** renders the interactive map
- **OpenStreetMap** provides the map tiles (free, open-source)
- **Nominatim** converts GPS coordinates to a human-readable address (e.g. "Mumbai, Maharashtra, India")
- Custom `L.divIcon` markers — green for you, blue for connections, grey for stale (>3h old)
- Map auto-fits to show all markers on screen

## Database schema (SQLite)

| Table | Columns |
|-------|---------|
| `users` | `id`, `username`, `email`, `password_hash`, `share_code`, `created_at` |
| `connections` | `id`, `user_id`, `connected_user_id`, `created_at` |
| `locations` | `id`, `user_id`, `latitude`, `longitude`, `accuracy`, `address`, `recorded_at` |

## Key behaviour

- Location auto-shares every **3 hours**
- Map refreshes every **60 seconds**
- Reminder notification sent **5 minutes before** next auto-share
- `share_code` — unique 6-character code (A–Z, 2–9) used to connect two users
- JWT stored in `localStorage`, expires in 7 days

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Server port | `3847` |
| `JWT_SECRET` | JWT signing key | *(must be set)* |
| `NODE_ENV` | `development` / `production` | `development` |
| `DATA_DIR` | Folder where `locshare.db` is stored | `./` (project root) |

## Deployment files

| File | Purpose |
|------|---------|
| `Dockerfile` | Docker image — Node 20 slim, compiles `better-sqlite3` |
| `fly.toml` | Fly.io config — port 8080, Singapore region, persistent volume |
| `railway.json` | Railway config |
| `.env.example` | Template for local `.env` |
| `.dockerignore` | Excludes `node_modules`, `.env`, local DB from image |

## External services used

| Service | What for | Cost |
|---------|---------|------|
| OpenStreetMap | Map tiles | Free, no key |
| Nominatim | Reverse geocoding (coords → address) | Free, no key |
| Browser Geolocation API | GPS coordinates | Free, built-in |
| Web Push / Notifications API | Share reminders | Free, built-in |

## Local development

```powershell
npm install
copy .env.example .env   # then set JWT_SECRET in .env
npm start                # runs on http://localhost:3847
```
