requireAuth();

const SHARE_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const REFRESH_INTERVAL_MS = 60 * 1000;
const REMINDER_BEFORE_MS = 5 * 60 * 1000; // notify 5 min before

let map;
let markers = {};
let shareTimer = null;
let refreshTimer = null;
let nextShareAt = null;
let countdownTimer = null;
let reminderTimer = null;

const user = getUser();
document.getElementById('userName').textContent = user?.username || 'User';

async function init() {
  try {
    const { user: me } = await api('/connections/me');
    document.getElementById('shareCode').textContent = me.shareCode;
    localStorage.setItem('locshare_user', JSON.stringify(me));
  } catch {
    logout();
    return;
  }

  if (isStandalone()) {
    document.getElementById('pwaTips')?.classList.add('hidden');
  }

  setupNotifyButton();
  initMap();
  await loadConnections();
  restoreNextShare();

  if (!nextShareAt || Date.now() >= nextShareAt) {
    await shareLocation(true);
  } else {
    scheduleNextShare(false);
  }

  startAutoShare();
  startRefresh();
  setupVisibilityHandler();

  document.getElementById('connectForm').addEventListener('submit', handleConnect);
  document.getElementById('shareNowBtn').addEventListener('click', () => shareLocation(false));
  document.getElementById('copyCodeBtn').addEventListener('click', copyShareCode);
}

function setupNotifyButton() {
  const btn = document.getElementById('notifyBtn');
  if (!btn) return;

  if (!('Notification' in window)) {
    btn.textContent = 'Notifications not supported';
    btn.disabled = true;
    return;
  }

  if (Notification.permission === 'granted') {
    btn.textContent = 'Reminders enabled ✓';
    btn.disabled = true;
  }

  btn.addEventListener('click', async () => {
    const ok = await requestNotificationPermission();
    if (ok) {
      btn.textContent = 'Reminders enabled ✓';
      btn.disabled = true;
    }
  });
}

function restoreNextShare() {
  const saved = localStorage.getItem('locshare_next_share');
  if (saved) {
    nextShareAt = parseInt(saved, 10);
    if (Date.now() >= nextShareAt) {
      shareLocation(true);
    } else {
      scheduleNextShare(false);
    }
  }
}

function setupVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (nextShareAt && Date.now() >= nextShareAt) {
      shareLocation(true);
    }
    loadConnections();
    if (map) setTimeout(() => map.invalidateSize(), 200);
  });
}

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
}

function createIcon(color, label) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-pin" style="background:${color}"><span>${label}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

async function loadConnections() {
  try {
    const { connections } = await api('/connections');
    renderConnectionsList(connections);
    updateMapMarkers(connections);
  } catch (err) {
    console.error(err);
  }
}

function renderConnectionsList(connections) {
  const list = document.getElementById('connectionsList');
  document.getElementById('connCount').textContent = connections.length;

  if (!connections.length) {
    list.innerHTML = '<li class="empty-state">No connections yet. Share your code above!</li>';
    return;
  }

  list.innerHTML = connections.map(c => {
    const recent = isRecent(c.recorded_at);
    const hasLoc = c.latitude != null;
    return `
      <li class="conn-item ${recent ? 'active' : ''}">
        <div class="conn-info">
          <span class="conn-name">${escapeHtml(c.username)}</span>
          <span class="conn-time">${hasLoc ? timeAgo(c.recorded_at) : 'No location yet'}</span>
        </div>
        <button class="btn-icon" onclick="removeConnection('${c.id}', '${escapeHtml(c.username)}')" title="Remove">✕</button>
      </li>
    `;
  }).join('');
}

function updateMapMarkers(connections) {
  Object.keys(markers).forEach(id => {
    if (id !== 'self') {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  });

  const bounds = [];

  connections.forEach(c => {
    if (c.latitude == null) return;
    const recent = isRecent(c.recorded_at);
    const color = recent ? '#3b82f6' : '#94a3b8';
    const marker = L.marker([c.latitude, c.longitude], {
      icon: createIcon(color, c.username.charAt(0).toUpperCase())
    }).addTo(map);

    marker.bindPopup(`
      <strong>${escapeHtml(c.username)}</strong><br>
      ${c.address ? escapeHtml(c.address) + '<br>' : ''}
      Updated: ${formatTime(c.recorded_at)}<br>
      <small>${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}</small>
    `);

    markers[c.id] = marker;
    bounds.push([c.latitude, c.longitude]);
  });

  if (markers.self) {
    const pos = markers.self.getLatLng();
    bounds.push([pos.lat, pos.lng]);
  }

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 13);
  }
}

async function shareLocation(silent = false) {
  const statusEl = document.getElementById('shareStatus');
  const btn = document.getElementById('shareNowBtn');

  if (!silent) {
    btn.disabled = true;
    btn.textContent = 'Getting location…';
  }

  statusEl.innerHTML = '<span class="status-dot loading"></span><span>Getting your location…</span>';

  try {
    const pos = await getCurrentPosition();
    const { latitude, longitude, accuracy } = pos.coords;

    let address = '';
    try {
      address = await reverseGeocode(latitude, longitude);
    } catch { /* optional */ }

    await api('/locations', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, accuracy, address })
    });

    showSelfMarker(latitude, longitude, address);

    statusEl.innerHTML = '<span class="status-dot active"></span><span>Location shared successfully</span>';
    scheduleNextShare();
    await loadConnections();
  } catch (err) {
    statusEl.innerHTML = `<span class="status-dot error"></span><span>${escapeHtml(err.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Share location now';
  }
}

function showSelfMarker(lat, lng, address) {
  if (markers.self) map.removeLayer(markers.self);

  markers.self = L.marker([lat, lng], {
    icon: createIcon('#10b981', 'You')
  }).addTo(map);

  markers.self.bindPopup(`
    <strong>You</strong><br>
    ${address ? escapeHtml(address) + '<br>' : ''}
    Just shared<br>
    <small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>
  `).openPopup();

  if (!Object.keys(markers).some(k => k !== 'self')) {
    map.setView([lat, lng], 13);
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const msgs = {
        1: 'Location permission denied. Please allow location access.',
        2: 'Unable to determine your location.',
        3: 'Location request timed out.'
      };
      reject(new Error(msgs[err.code] || 'Failed to get location'));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  return data.display_name || '';
}

function startAutoShare() {
  if (shareTimer) clearInterval(shareTimer);
  shareTimer = setInterval(() => shareLocation(true), SHARE_INTERVAL_MS);
}

function scheduleNextShare(resetTime = true) {
  if (resetTime) {
    nextShareAt = Date.now() + SHARE_INTERVAL_MS;
    localStorage.setItem('locshare_next_share', String(nextShareAt));
  }
  if (countdownTimer) clearInterval(countdownTimer);
  if (reminderTimer) clearTimeout(reminderTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);

  const untilReminder = nextShareAt - Date.now() - REMINDER_BEFORE_MS;
  if (untilReminder > 0) {
    reminderTimer = setTimeout(() => sendShareReminder(), untilReminder);
  }
}

function updateCountdown() {
  const el = document.getElementById('nextShare');
  if (!nextShareAt) {
    el.textContent = 'Next auto-share: —';
    return;
  }
  const remaining = nextShareAt - Date.now();
  if (remaining <= 0) {
    el.textContent = 'Next auto-share: any moment…';
    return;
  }
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  el.textContent = `Next auto-share: ${h}h ${m}m ${s}s`;
}

function startRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadConnections, REFRESH_INTERVAL_MS);
}

async function handleConnect(e) {
  e.preventDefault();
  const input = document.getElementById('connectCode');
  const msg = document.getElementById('connectMsg');
  const code = input.value.trim().toUpperCase();

  if (!code) return;

  msg.classList.add('hidden');

  try {
    const data = await api('/connections/connect', {
      method: 'POST',
      body: JSON.stringify({ shareCode: code })
    });
    msg.textContent = data.message;
    msg.className = 'toast-msg success';
    input.value = '';
    await loadConnections();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'toast-msg error';
  }
  msg.classList.remove('hidden');
}

async function removeConnection(id, name) {
  if (!confirm(`Remove connection with ${name}?`)) return;
  try {
    await api(`/connections/${id}`, { method: 'DELETE' });
    await loadConnections();
  } catch (err) {
    alert(err.message);
  }
}

function copyShareCode() {
  const code = document.getElementById('shareCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copyCodeBtn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();

window.removeConnection = removeConnection;
