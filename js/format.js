// ── Formatting ───────────────────────────────────────────────────────
function formatDistance(km) {
  if (km < 0) return '—';
  if (km < 1000) return km.toFixed(0) + ' km';
  if (km < 1e6) return (km / 1e3).toFixed(0) + ',000 km';
  if (km < 1e9) return (km / 1e6).toFixed(1) + 'M km';
  return (km / 1e9).toFixed(2) + 'B km';
}

function connectionDetail(c) {
  let d = 'Distance: ' + formatDistance(c.range) + '\n';
  d += 'Light time: ' + formatLightTime(c.rtlt) + '\n';
  if (c.dataRate > 0) d += 'Data rate: ' + (c.dataRate / 1000).toFixed(1) + ' kb/s\n';
  if (c.azimuth > 0 || c.elevation > 0) d += 'Dish pointing: ' + c.azimuth.toFixed(0) + '\u00B0 az, ' + c.elevation.toFixed(0) + '\u00B0 el\n';
  d += 'Band: ' + c.activity;
  return d;
}

function formatLightTime(seconds) {
  if (seconds < 0 || seconds === 0) return '—';
  if (seconds < 60) return seconds.toFixed(1) + 's';
  if (seconds < 3600) return (seconds / 60).toFixed(1) + ' min';
  return (seconds / 3600).toFixed(1) + ' hrs';
}

function dishColor(activity, alpha) {
  const rgb = !activity ? '74,85,104'
    : (a => a.includes('telemetry') || a.includes('command') ? '106,191,138'
    : a.includes('sustaining') ? '91,143,185'
    : a.includes('upgrade') ? '212,162,106'
    : a.includes('maintenance') ? '224,112,112'
    : '74,85,104')(activity.toLowerCase());
  if (alpha !== undefined) return `rgba(${rgb},${alpha})`;
  const [r, g, b] = rgb.split(',');
  return '#' + [r, g, b].map(v => (+v).toString(16).padStart(2, '0')).join('');
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getDishPos(stationId, dishName) {
  const s = stationPositions.find(p => p.id === stationId);
  if (!s) return { x: 0, y: 0 };
  const dishes = stationDishes[stationId] || [];
  const idx = dishes.indexOf(dishName);
  const n = dishes.length;
  const gap = isMobile ? 22 : 28;
  const totalWidth = (n - 1) * gap;
  const x = idx >= 0 ? s.x - totalWidth / 2 + idx * gap : s.x;
  return { x, y: s.y - 8 };
}
