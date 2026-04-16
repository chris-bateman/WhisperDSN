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
  { label: 'Moon',          distance: 384400,   color: '160,170,180', fixedY: 0.79 },
  { label: 'Venus',         distance: 41.4e6,   color: '201,169,110' },
  { label: 'Mercury',       distance: 91.7e6,   color: '140,126,109' },
  { label: 'Mars',          distance: 225e6,     color: '192,96,58' },
  { label: 'Jupiter',       distance: 778e6,     color: '200,165,90' },
  { label: 'Saturn',        distance: 1.4e9,     color: '212,184,106' },
  { label: 'Uranus',        distance: 2.87e9,    color: '107,181,201' },
  { label: 'Neptune',       distance: 4.5e9,     color: '74,111,165' },
  { label: 'Heliopause',    distance: 18e9,      color: '100,100,120' },
];

function drawDistanceMarkers() {
  const headerFloor = isMobile ? 100 : 75;
  const skyTop = Math.max(H * (isMobile ? 0.12 : 0.06), headerFloor);
  const skyBottom = H * (isMobile || isShortScreen ? 0.58 : 0.78);
  const maxLog = Math.log10(Math.max(currentMaxRange, 100));

  // Title card occupies top-left; status bar occupies top-right
  // Place labels at ~40% from right — clear of both
  const labelX = W * 0.62;

  DISTANCE_MARKERS.forEach(m => {
    if (m.distance > currentMaxRange * 2) return;
    let y;
    if (m.fixedY !== undefined) {
      // Fixed position (e.g. Moon rendered close to stations)
      y = H * m.fixedY;
    } else {
      const logDist = Math.log10(m.distance);
      const yRatio = 1 - (logDist / maxLog);
      y = skyTop + yRatio * (skyBottom - skyTop);
    }
    // Hard floor: never render in the header zone (title + status bar)
    const headerFloor = isMobile ? 100 : 75;
    if (y < headerFloor || y > H * 0.95) return;

    // Arc across full width
    const bowDepth = isMobile ? 4 : 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(W / 2, y + bowDepth, W, y);
    ctx.strokeStyle = `rgba(${m.color},0.12)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Label with dark backing for readability
    const fontSize = isMobile ? 7 : 8;
    ctx.font = fontSize + 'px "JetBrains Mono"';
    const textW = ctx.measureText(m.label).width;
    const ly = y + bowDepth * (labelX / W) * (1 - labelX / W) * 4; // match arc curve

    ctx.fillStyle = '#05070a';
    ctx.fillRect(labelX - 4, ly - fontSize, textW + 8, fontSize + 3);

    ctx.fillStyle = `rgba(${m.color},0.35)`;
    ctx.textAlign = 'left';
    ctx.fillText(m.label, labelX, ly);
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
