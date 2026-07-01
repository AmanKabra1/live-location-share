# LocShare — Deploy on Render

Render builds your existing `Dockerfile` directly — no code changes needed.

---

## Before you deploy

1. Push project to **GitHub** (skip if already pushed):
   ```powershell
   cd C:\Users\Lenovo\Desktop\Personal\live-location-share
   git add .
   git commit -m "Ready for deploy"
   git push
   ```

2. Generate a `JWT_SECRET` (long random string):
   ```powershell
   [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   ```

---

## Deploy steps

1. Go to **https://render.com** → sign up with GitHub

2. Dashboard → **New** → **Web Service** → connect GitHub → select your repo

3. Configure:
   | Field | Value |
   |-------|-------|
   | Name | `locshare` |
   | Region | Singapore (or nearest to you) |
   | Branch | `main` |
   | Runtime | **Docker** |
   | Instance Type | **Free** |

4. Add environment variables (under **Environment**):
   | Name | Value |
   |------|-------|
   | `JWT_SECRET` | *(the random string you generated)* |
   | `NODE_ENV` | `production` |
   | `DATA_DIR` | `/tmp/data` |

5. Click **Create Web Service** → wait ~5 min for the Docker build

6. Open your URL:
   ```
   https://locshare-xxxx.onrender.com
   ```

---

## Verify it worked

```
https://your-app.onrender.com/api/health
```
Should return `{"status":"ok","service":"LocShare","pwa":true}`.

---

## Known limitations (Render free tier)

| Limitation | Detail |
|------------|--------|
| Sleeps when idle | Spins down after 15 min inactivity; ~30s wake-up on next request |
| Data resets on redeploy | `DATA_DIR=/tmp/data` is not persistent — every redeploy wipes the SQLite DB |

**To keep data permanently:** Dashboard → your service → **Disks** → **Add Disk** → mount at `/data` (~$0.25/GB/month) → change `DATA_DIR` env var to `/data`.

---

## Install as PWA on mobile (no Play Store)

Open your HTTPS Render URL on your phone:

### Android (Chrome)
1. Open site → log in
2. Tap **Install** banner OR menu → **Install app** / **Add to Home screen**

### iPhone (Safari)
1. Open site → log in
2. Tap **Share** → **Add to Home Screen**

LocShare opens full-screen like an app. Allow **Location** and **Notifications** when asked.

---

## Quick test after deploy

1. Register 2 accounts (phone + laptop)
2. Connect using share codes
3. Allow location on both
4. See each other on the map
