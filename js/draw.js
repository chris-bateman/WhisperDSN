// ── Draw ─────────────────────────────────────────────────────────────
function draw(t) {
  // Full clear — no ghosting
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);

  // Starfield
  drawStarfield(t);

  // Distance reference lines
  drawDistanceMarkers();

  // Drifting asteroid easter egg hint
  updateEasterRock();
  drawEasterRock();

  // Easter egg game takes over rendering
  if (gameState) {
    updateGame(t);
    drawGame(t);
    requestAnimationFrame(draw);
    return;
  }

  // Smooth interpolation for all connections
  connections.forEach(c => {
    c.renderX += (c.targetX - c.renderX) * 0.05;
    c.renderY += (c.targetY - c.renderY) * 0.05;
  });

  // Smooth stat counters
  dataRateDisplay += (dataRateTarget - dataRateDisplay) * 0.05;
  powerDisplay += (powerTarget - powerDisplay) * 0.05;
  const drBytes = dataRateDisplay / 8;
  document.getElementById('data-rate-value').textContent =
    drBytes >= 1e6 ? (drBytes / 1e6).toFixed(1) : drBytes >= 1e3 ? (drBytes / 1e3).toFixed(0) + 'k' : Math.round(drBytes).toLocaleString();
  document.getElementById('power-value').textContent = powerDisplay.toFixed(1);

  // Planet markers (drawn behind connection lines)
  drawPlanetMarkers();

  // Draw connections (lines from dish positions to spacecraft)
  connections.forEach(c => {
    const dp = getDishPos(c.station.id, c.dish);
    const active = c.hasActiveUp || c.hasActiveDown;
    ctx.beginPath();
    ctx.moveTo(dp.x, dp.y);
    ctx.lineTo(c.renderX, c.renderY);
    if (active) {
      const both = c.hasActiveUp && c.hasActiveDown;
      ctx.strokeStyle = both ? 'rgba(106,191,138,0.08)' :
                        c.hasActiveDown ? 'rgba(91,143,185,0.08)' :
                        'rgba(212,162,106,0.08)';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(45,55,72,0.15)';
      ctx.lineWidth = 0.5;
    }
    ctx.stroke();

    // Signal waveform along active connection lines (skip on mobile — too noisy)
    if (active && !isMobile) drawWaveform(c, dp, t);

    // Spacecraft dot / icon
    const scName = spacecraftNames[c.scId];
    const scColor = active ? (c.hasActiveUp && c.hasActiveDown ? '#6abf8a' : c.hasActiveDown ? '#5b8fb9' : '#d4a26a') : '#2d3748';
    const iconFn = SPACECRAFT_ICONS[c.scId];
    if (iconFn) {
      const iconSize = isMobile ? (active ? 12 : 8) : (active ? 10 : 7);
      iconFn(ctx, c.renderX, c.renderY, iconSize, scColor);
    } else {
      const dotR = isMobile ? (active ? 5 : 3.5) : (active ? 3 : 2);
      ctx.beginPath();
      ctx.arc(c.renderX, c.renderY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = scColor;
      ctx.fill();
    }

    // Spacecraft label
    const label = scName || c.scId;
    ctx.font = (isMobile ? '11' : '9') + 'px "JetBrains Mono"';
    ctx.fillStyle = active ? 'rgba(200,214,229,0.6)' : 'rgba(74,85,104,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(label, c.renderX, c.renderY - (isMobile ? 10 : 8));

    // Distance label
    if (active) {
      ctx.font = (isMobile ? '9' : '8') + 'px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(74,85,104,0.5)';
      ctx.fillText(formatDistance(c.range), c.renderX, c.renderY + (isMobile ? 16 : 14));
    }
  });

  // Draw particles with short manual trail
  spawnParticles();
  particles = particles.filter(p => p.progress < 1);
  particles.forEach(p => {
    p.progress += p.speed;
    const baseAlpha = Math.sin(p.progress * Math.PI) * 0.8;

    // Draw trail (3 fading dots behind the head)
    for (let i = 3; i >= 0; i--) {
      const tp = Math.max(p.progress - p.speed * i * 2, 0);
      const x = p.sx + (p.tx - p.sx) * tp;
      const y = p.sy + (p.ty - p.sy) * tp;
      const a = baseAlpha * (1 - i * 0.25);
      const r = 1.5 - i * 0.3;
      if (a > 0 && r > 0) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`;
        ctx.fill();
      }
    }
  });

  // Draw light pulses (multiple can race)
  lightPulses = lightPulses.filter(lp => {
    const elapsed = performance.now() - lp.startTime;
    const progress = Math.min(elapsed / lp.duration, 1);

    if (progress >= 1) return false; // clean removal, no afterglow

    const x = lp.sx + (lp.tx - lp.sx) * progress;
    const y = lp.sy + (lp.ty - lp.sy) * progress;

    // Pulse dot — moderate alpha so fade-trail can clear it
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,162,106,0.5)';
    ctx.fill();

    // Timer label — shows real light time elapsed
    const displayTime = (elapsed / 1000) * lp.timeScale;
    let timeStr;
    if (displayTime < 60) timeStr = displayTime.toFixed(1) + 's';
    else if (displayTime < 3600) timeStr = (displayTime / 60).toFixed(1) + ' min';
    else timeStr = (displayTime / 3600).toFixed(1) + ' hrs';

    ctx.font = '10px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(212,162,106,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, x, y - 16);

    return true;
  });

  // Draw stations and dishes
  stationPositions.forEach(s => {
    const dishes = stationDishes[s.id] || [];
    const info = stationInfo[s.id];
    const activeDishes = new Set(
      connections.filter(c => c.station.id === s.id && (c.hasActiveUp || c.hasActiveDown)).map(c => c.dish)
    );
    const n = dishes.length;
    const gap = isMobile ? 22 : 28;
    const totalWidth = (n - 1) * gap;

    dishes.forEach((dish, i) => {
      const dx = s.x - totalWidth / 2 + i * gap;
      const dy = s.y - 8;
      const active = activeDishes.has(dish);
      const num = dish.replace('DSS', '');

      const activity = (info && info.dishActivity && info.dishActivity[dish]) || '';

      ctx.beginPath();
      ctx.arc(dx, dy, active ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = active ? 'rgba(106,191,138,0.9)' : dishColor(activity, 0.5);
      ctx.fill();

      ctx.font = '9px "JetBrains Mono"';
      ctx.fillStyle = active ? 'rgba(106,191,138,0.7)' : dishColor(activity, 0.4);
      ctx.textAlign = 'center';
      ctx.fillText(num, dx, dy + 14);
    });

    // Station name
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillStyle = '#c8d6e5';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, s.x, s.y + 26);

    // Location + local time
    let locLine = s.loc;
    if (info && info.tzOffset !== undefined) {
      const localMs = Date.now() + info.tzOffset;
      const local = new Date(localMs);
      const hh = String(local.getUTCHours()).padStart(2, '0');
      const mm = String(local.getUTCMinutes()).padStart(2, '0');
      locLine += '  ' + hh + ':' + mm;
    }
    ctx.font = '8px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(74,85,104,0.7)';
    ctx.fillText(locLine, s.x, s.y + 38);

    // Last tracked spacecraft at this station
    const seen = loadSeen();
    const stationSeen = Object.entries(seen)
      .filter(([, d]) => d.stationId === s.id)
      .sort((a, b) => b[1].ts - a[1].ts);
    if (stationSeen.length > 0 && !connections.some(c => c.station.id === s.id && (c.hasActiveUp || c.hasActiveDown))) {
      const [lastId, lastData] = stationSeen[0];
      const ago = Math.round((Date.now() - lastData.ts) / 60000);
      const name = spacecraftNames[lastId] || lastId;
      const agoStr = ago < 1 ? 'just now' : ago < 60 ? ago + 'm ago' : Math.round(ago / 60) + 'h ago';
      ctx.font = '8px "JetBrains Mono"';
      ctx.fillStyle = 'rgba(74,85,104,0.4)';
      ctx.fillText('last: ' + name + ' ' + agoStr, s.x, s.y + 50);
    }
  });

  checkHover();
  requestAnimationFrame(draw);
}
