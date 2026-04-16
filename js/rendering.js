// ── Starfield ────────────────────────────────────────────────────────
function initStarfield() {
  const count = isMobile ? 100 : 200;
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.75,
      brightness: 0.1 + Math.random() * 0.3,
      twinkleSpeed: 0.0005 + Math.random() * 0.002,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
}

function drawStarfield(t) {
  stars.forEach(s => {
    const alpha = s.brightness * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase));
    ctx.fillStyle = `rgba(200,214,229,${alpha})`;
    ctx.fillRect(s.x, s.y, 1, 1);
  });
}

// ── Distance Reference Lines ────────────────────────────────────────
const DISTANCE_MARKERS = [
  { label: 'Heliopause',    distance: 18e9,      color: '100,100,120' },
  { label: 'Neptune',       distance: 4.5e9,     color: '74,111,165' },
  { label: 'Uranus',        distance: 2.87e9,    color: '107,181,201' },
  { label: 'Saturn',        distance: 1.4e9,     color: '212,184,106' },
  { label: 'Jupiter',       distance: 778e6,     color: '200,165,90' },
  { label: 'Mars',          distance: 225e6,     color: '192,96,58' },
  { label: 'Sun',           distance: 150e6,     color: '255,200,60' },
  { label: 'Mercury',       distance: 91.7e6,    color: '140,126,109' },
  { label: 'Venus',         distance: 41.4e6,    color: '201,169,110' },
  { label: 'Moon',          distance: 384400,    color: '160,170,180' },
];

function drawDistanceMarkers() {
  const headerFloor = isMobile ? 110 : 85;
  const skyTop = Math.max(H * (isMobile ? 0.12 : 0.06), headerFloor);
  const skyBottom = H * (isMobile ? 0.75 : isShortScreen ? 0.58 : 0.78);
  const maxLog = Math.log10(Math.max(currentMaxRange, 100));

  let lastLabelY = -Infinity;
  const minLabelGap = isMobile ? 12 : 10;

  DISTANCE_MARKERS.forEach(m => {
    if (m.distance > currentMaxRange * 2) return;
    // Same log scale as spacecraft layout
    const logDist = Math.log10(Math.max(m.distance, 100));
    const yRatio = 1 - (logDist / maxLog);
    const y = skyTop + yRatio * (skyBottom - skyTop);
    if (y < headerFloor || y > H * 0.95) return;

    // Arc across full width
    const bowDepth = isMobile ? 4 : 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(W / 2, y + bowDepth, W, y);
    ctx.strokeStyle = `rgba(${m.color},0.12)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Label — skip if too close to the previous label
    if (Math.abs(y - lastLabelY) < minLabelGap) return;
    lastLabelY = y;
    const fontSize = isMobile ? 7 : 8;
    ctx.font = fontSize + 'px "JetBrains Mono"';
    ctx.fillStyle = `rgba(${m.color},0.3)`;
    ctx.textAlign = 'left';
    ctx.fillText(m.label, isMobile ? 6 : 200, y - 3);
  });
}

function drawPlanetMarkers() {
  // Collect spacecraft per planet
  const planetSc = {};
  connections.forEach(c => {
    const planetName = SC_PLANET[c.scId];
    if (!planetName) return;
    if (!planetSc[planetName]) planetSc[planetName] = { conns: [], avgX: 0, avgY: 0 };
    planetSc[planetName].conns.push(c);
  });

  drawnPlanets = [];

  Object.entries(planetSc).forEach(([planetName, data]) => {
    const p = PLANET_BY_NAME[planetName];
    if (!p) return;

    // Average position of all spacecraft around this planet
    const avgX = data.conns.reduce((s, c) => s + c.renderX, 0) / data.conns.length;
    const avgY = data.conns.reduce((s, c) => s + c.renderY, 0) / data.conns.length;

    const hex = p.color;
    const pr = parseInt(hex.slice(1, 3), 16);
    const pg = parseInt(hex.slice(3, 5), 16);
    const pb = parseInt(hex.slice(5, 7), 16);
    const r = isMobile ? p.radius * 0.8 : p.radius;

    // Offset to the left of the spacecraft cluster
    const x = avgX - (isMobile ? 25 : 35);
    const y = avgY;

    // Planet circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${pr},${pg},${pb},0.25)`;
    ctx.fill();

    // Saturn ring
    if (p.ring) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.8, r * 0.4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${pr},${pg},${pb},0.2)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Label
    ctx.font = (isMobile ? '7' : '8') + 'px "JetBrains Mono"';
    ctx.fillStyle = `rgba(${pr},${pg},${pb},0.3)`;
    ctx.textAlign = 'right';
    ctx.fillText(p.name, x - r - 3, y + 3);

    drawnPlanets.push({
      name: planetName, x, y, r: Math.max(r, 10), // min hit area
      spacecraft: data.conns.map(c => c.scId),
    });
  });
}
