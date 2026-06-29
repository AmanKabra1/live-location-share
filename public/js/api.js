const API = '/api';

function getToken() {
  return localStorage.getItem('locshare_token');
}

function getUser() {
  const raw = localStorage.getItem('locshare_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem('locshare_token', token);
  localStorage.setItem('locshare_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('locshare_token');
  localStorage.removeItem('locshare_user');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function redirectIfLoggedIn() {
  if (getToken()) window.location.href = '/dashboard.html';
}

function requireAuth() {
  if (!getToken()) window.location.href = '/login.html';
}

function logout() {
  clearSession();
  window.location.href = '/';
}

function formatTime(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function timeAgo(iso) {
  if (!iso) return 'No location yet';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  const diff = Date.now() - d.getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs >= 24) return `${Math.floor(hrs / 24)}d ago`;
  if (hrs > 0) return `${hrs}h ${mins}m ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function isRecent(iso, hours = 3) {
  if (!iso) return false;
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return Date.now() - d.getTime() < hours * 3600000;
}
