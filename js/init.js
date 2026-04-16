// ── Last-seen cache (24hr persistence via localStorage) ──────────────
const SEEN_KEY = 'whisperdsn_seen';
const SEEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

let _seenCache = null;

function loadSeen() {
  if (_seenCache) return _seenCache;
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const now = Date.now();
    Object.keys(data).forEach(k => {
      if (now - data[k].ts > SEEN_TTL) delete data[k];
    });
    _seenCache = data;
    return data;
  } catch(e) { _seenCache = {}; return _seenCache; }
}

function saveSeen(seen) {
  _seenCache = seen;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch(e) {}
}

// ── About overlay ────────────────────────────────────────────────────
document.getElementById('about-link').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('about-overlay').classList.add('visible');
});
document.getElementById('about-close').addEventListener('click', () => {
  document.getElementById('about-overlay').classList.remove('visible');
});
document.getElementById('about-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    document.getElementById('about-overlay').classList.remove('visible');
  }
});

// ── Pulse hint ───────────────────────────────────────────────────────
setTimeout(() => {
  if (!hintShown) {
    document.getElementById('pulse-hint').classList.add('visible');
    setTimeout(() => document.getElementById('pulse-hint').classList.remove('visible'), 6000);
    hintShown = true;
  }
}, 4000);

// ── Boot ─────────────────────────────────────────────────────────────
resize();
fetchSpacecraftNames();
fetchDistances();
fetchDSN();
setInterval(fetchDSN, 5000);
requestAnimationFrame(draw);
