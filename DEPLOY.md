# LocShare — Free Deployment Guide

Deploy LocShare for **free** (no Render). All options include **HTTPS** so GPS works on mobile.

---

## Before you deploy

1. Push project to **GitHub**:
   ```powershell
   cd C:\Users\Lenovo\live-location-share
   git init
   git add .
   git commit -m "LocShare PWA ready for deploy"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/locshare.git
   git push -u origin main
   ```

2. Set these **environment variables** on every platform:
   | Variable | Value |
   |----------|-------|
   | `JWT_SECRET` | Long random string (e.g. 32+ chars) |
   | `NODE_ENV` | `production` |
   | `DATA_DIR` | `/data` (for Docker) |

---

## Option 1 — Fly.io (Recommended, free tier)

**Free:** 3 shared VMs, 3GB storage volume, HTTPS included.

1. Install CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Run:
   ```powershell
   cd C:\Users\Lenovo\live-location-share
   fly auth login
   fly launch --no-deploy
   fly secrets set JWT_SECRET="your-super-secret-key-here"
   fly volumes create locshare_data --size 1 --region sin
   fly deploy
   ```
3. Open: `https://YOUR-APP.fly.dev`

Data persists in the `/data` volume (users and locations saved).

---

## Option 2 — Koyeb (Free, easy)

**Free:** 1 web service, scales to zero when idle.

1. Go to https://www.koyeb.com and sign up with GitHub
2. **Create App** → **GitHub** → select your repo
3. Builder: **Dockerfile**
4. Port: `8080`
5. Add env vars: `JWT_SECRET`, `NODE_ENV=production`, `DATA_DIR=/tmp/data`
6. Deploy

Note: On Koyeb free tier without volume, data may reset on redeploy. Fine for testing.

---

## Option 3 — Railway

**Free:** ~$5 credit/month (enough for small apps).

1. Go to https://railway.app → **New Project** → **Deploy from GitHub**
2. Select repo → Railway detects `Dockerfile`
3. Variables → add `JWT_SECRET`, `NODE_ENV=production`, `DATA_DIR=/data`
4. Settings → generate domain → Deploy

---

## Option 4 — Back4App Containers

Back4App runs **Docker containers** (not Parse BaaS for this app).

1. Go to https://www.back4app.com and sign up
2. Open **Containers**
3. **New Container** → connect GitHub repo
4. Set:
   - Dockerfile path: `Dockerfile`
   - Port: `8080`
   - Env: `JWT_SECRET`, `NODE_ENV=production`, `DATA_DIR=/data`
5. Deploy → get URL like `https://your-app.back4app.io`

Back4App free tier has limits; good for demos and small user counts.

---

## Option 5 — Oracle Cloud Always Free (VPS)

**Free forever:** 2 ARM VMs (always on, full control).

1. Create account: https://www.oracle.com/cloud/free/
2. Create **Compute Instance** (Ubuntu, ARM)
3. SSH in and run:
   ```bash
   sudo apt update && sudo apt install -y docker.io
   git clone https://github.com/YOUR_USERNAME/locshare.git
   cd locshare
   docker build -t locshare .
   docker run -d -p 80:8080 -e JWT_SECRET=your-secret -e DATA_DIR=/data -v locshare_data:/data --restart always locshare
   ```
4. Open firewall port 80 in Oracle console

Best if you want **always-on** with no sleep.

---

## Install as PWA on mobile (no Play Store)

After deploy, open your HTTPS URL on phone:

### Android (Chrome)
1. Open site → Log in
2. Tap **Install** banner OR menu → **Install app** / **Add to Home screen**

### iPhone (Safari)
1. Open site → Log in
2. Tap **Share** → **Add to Home Screen**

LocShare opens full-screen like an app. Allow **Location** and **Notifications** when asked.

---

## Mobile GPS notes

| Topic | Detail |
|-------|--------|
| Location permission | Required to share |
| GPS chip | Optional (Wi-Fi/cell works too) |
| HTTPS | Required on live site |
| 3-hour auto-share | Works while PWA is open; reminders via notifications |

---

## Quick test after deploy

1. Register 2 accounts (phone + laptop)
2. Connect using share codes
3. Allow location on both
4. See each other on the map

Health check: `https://YOUR-URL/api/health`
