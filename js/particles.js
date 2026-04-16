// ── Signal Waveform ─────────────────────────────────────────────────
const BAND_WAVELENGTH = { S: 40, X: 20, K: 10 };

function drawWaveform(c, dp, t) {
  const dx = c.renderX - dp.x, dy = c.renderY - dp.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 20) return;

  // Perpendicular direction
  const nx = -dy / len, ny = dx / len;

  // Band -> wavelength
  const band = (c.band || '').toUpperCase().charAt(0);
  const wl = BAND_WAVELENGTH[band] || 25;

  // Data rate -> amplitude (subtle)
  const amp = Math.min(Math.max(Math.log10(Math.max(c.dataRate, 1)) / 6, 0.15), 1.0) * 3;

  // Scroll direction: uplink scrolls toward spacecraft, downlink toward dish
  const dir = c.hasActiveUp && !c.hasActiveDown ? 1 : -1;
  const scroll = t * 0.002 * dir;

  const both = c.hasActiveUp && c.hasActiveDown;
  const r = both ? 106 : c.hasActiveDown ? 91 : 212;
  const g = both ? 191 : c.hasActiveDown ? 143 : 162;
  const b = both ? 138 : c.hasActiveDown ? 185 : 106;

  ctx.beginPath();
  const step = 4;
  for (let d = 0; d <= len; d += step) {
    const frac = d / len;
    const bx = dp.x + dx * frac;
    const by = dp.y + dy * frac;
    const wave = Math.sin((d / wl) * Math.PI * 2 + scroll) * amp;
    const px = bx + nx * wave;
    const py = by + ny * wave;
    d === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.strokeStyle = `rgba(${r},${g},${b},0.06)`;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

// ── Particles ────────────────────────────────────────────────────────

function spawnParticles() {
  connections.forEach(c => {
    if (!c.hasActiveUp && !c.hasActiveDown) return;
    if (Math.random() > 0.03) return;

    const goingUp = c.hasActiveUp && (!c.hasActiveDown || Math.random() > 0.5);

    // Speed scales inversely with log distance
    const logRange = Math.log10(Math.max(c.range, 1000));
    const speedFactor = Math.max(1 - (logRange / MAX_LOG_RANGE) * 0.85, 0.15);
    const speed = (0.004 + Math.random() * 0.004) * speedFactor;

    const dp = getDishPos(c.station.id, c.dish);
    particles.push({
      sx: goingUp ? dp.x : c.renderX,
      sy: goingUp ? dp.y : c.renderY,
      tx: goingUp ? c.renderX : dp.x,
      ty: goingUp ? c.renderY : dp.y,
      progress: 0,
      speed,
      r: goingUp ? 212 : 91,
      g: goingUp ? 162 : 143,
      b: goingUp ? 106 : 185,
    });
  });
}
