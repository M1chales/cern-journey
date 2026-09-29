// =========================================================
//  main.js — start everything
// =========================================================

BG.init();
Intro.init();
App.init();

// ---------- "Install app" button (Android / desktop Chrome, Edge…) ----------
let installEvent = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  App.toast({ en: 'Installed. Find it on your home screen.', el: 'Εγκαταστάθηκε. Θα το βρεις στην αρχική οθόνη.' });
});

// ---------- offline support ----------
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ---------- QR code on the last page (only if CONFIG.url is set) ----------
if (CONFIG.url) {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  s.onload = () => {
    const qr = qrcode(0, 'M');
    qr.addData(CONFIG.url);
    qr.make();
    document.getElementById('qrCode').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
    document.getElementById('qrBox').hidden = false;
  };
  document.head.appendChild(s);
}

// ---------- easter egg: type "higgs" anywhere ----------
let typed = '';
document.addEventListener('keydown', e => {
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-5);
  if (typed === 'higgs') {
    for (let i = 0; i < 4; i++) setTimeout(() => BG.burst(Math.random() * innerWidth, Math.random() * innerHeight, 110), i * 250);
    App.toast({ en: 'You found the Higgs boson. It took CERN 48 years.', el: 'Βρήκες το μποζόνιο Higgs. Το CERN χρειάστηκε 48 χρόνια.' }, 3500);
  }
});
