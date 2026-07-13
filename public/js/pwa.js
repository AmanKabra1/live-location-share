let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallBanner();
});

function showInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.remove('hidden');
}

function hideInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.add('hidden');
}

async function installPWA() {
  if (!deferredInstallPrompt) {
    alert(getInstallInstructions());
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (outcome === 'accepted') hideInstallBanner();
}

function getInstallInstructions() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'On iPhone: tap Share → Add to Home Screen';
  }
  if (/android/.test(ua)) {
    return 'On Android: tap menu (⋮) → Install app or Add to Home screen';
  }
  return 'Use your browser menu to install this app on your device.';
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendShareReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  new Notification('PinLoc — Time to share location', {
    body: 'Tap to open PinLoc and update your live location.',
    icon: '/icons/icon.svg',
    tag: 'locshare-reminder',
    renotify: true
  });
}

window.installPWA = installPWA;
window.hideInstallBanner = hideInstallBanner;
window.requestNotificationPermission = requestNotificationPermission;
window.sendShareReminder = sendShareReminder;
window.isStandalone = isStandalone;
