// ── Station Positions ────────────────────────────────────────────────
function getStationPositions() {
  if (isMobile) {
    return [
      { id: 'gdscc', name: 'Goldstone', loc: 'California, USA', x: W * 0.5, y: H * 0.65 },
      { id: 'mdscc', name: 'Madrid', loc: 'Robledo, Spain', x: W * 0.5, y: H * 0.76 },
      { id: 'cdscc', name: 'Canberra', loc: 'Tidbinbilla, Australia', x: W * 0.5, y: H * 0.87 },
    ];
  }
  if (isShortScreen) {
    const y = H * 0.88;
    return [
      { id: 'gdscc', name: 'Goldstone', loc: 'California, USA', x: W * 0.2, y },
      { id: 'mdscc', name: 'Madrid', loc: 'Robledo, Spain', x: W * 0.5, y },
      { id: 'cdscc', name: 'Canberra', loc: 'Tidbinbilla, Australia', x: W * 0.8, y },
    ];
  }
  const y = H * 0.82;
  return [
    { id: 'gdscc', name: 'Goldstone', loc: 'California, USA', x: W * 0.2, y },
    { id: 'mdscc', name: 'Madrid', loc: 'Robledo, Spain', x: W * 0.5, y },
    { id: 'cdscc', name: 'Canberra', loc: 'Tidbinbilla, Australia', x: W * 0.8, y },
  ];
}

// ── Layout: position dishes and spacecraft ───────────────────────────
function layoutConnections(newConnections) {
  // Save current connections to the last-seen cache
  const seen = loadSeen();
  const now = Date.now();
  newConnections.forEach(c => {
    seen[c.scId] = {
      ts: now, range: c.range, rtlt: c.rtlt,
      stationId: c.station.id, dish: c.dish,
      hasActiveUp: c.hasActiveUp, hasActiveDown: c.hasActiveDown,
      activity: c.activity, dataRate: c.dataRate, band: c.band || '',
      azimuth: c.azimuth, elevation: c.elevation,
    };
  });
  saveSeen(seen);

  // Inject stale (last-seen) spacecraft not in the current feed
  const activeIds = new Set(newConnections.map(c => c.scId));
  Object.entries(seen).forEach(([scId, data]) => {
    if (activeIds.has(scId)) return;
    const stationPos = stationPositions.find(p => p.id === data.stationId);
    if (!stationPos) return;
    newConnections.push({
      station: stationPos, dish: data.dish, scId,
      range: data.range, rtlt: data.rtlt,
      hasActiveUp: false, hasActiveDown: false,
      activity: data.activity || '', dataRate: 0, band: data.band || '',
      azimuth: data.azimuth || 0, elevation: data.elevation || 0,
      targetX: 0, targetY: 0, renderX: 0, renderY: 0,
      stale: true,
    });
  });

  const conns = newConnections;
  const maxRange = Math.max(...conns.map(c => c.range), 1);
  currentMaxRange = maxRange;
  const skyTop = H * (isMobile ? 0.12 : 0.06);
  const skyBottom = H * (isMobile || isShortScreen ? 0.40 : 0.55);

  // Group by station for spacecraft fan-out
  const byStation = {};
  conns.forEach(c => {
    const sid = c.station.id;
    if (!byStation[sid]) byStation[sid] = [];
    byStation[sid].push(c);
  });

  const stationIds = Object.keys(byStation);
  Object.entries(byStation).forEach(([sid, group]) => {
    const stationX = group[0].station.x;
    // Mobile: each station gets its own horizontal zone
    const fanCenterX = isMobile ? W * ((stationIds.indexOf(sid) + 0.5) / stationIds.length) : stationX;
    const spread = isMobile ? W * (0.7 / stationIds.length) : W * 0.25;

    group.forEach(c => {
      // Vertical: log-scale distance
      const logDist = Math.log10(Math.max(c.range, 100));
      const maxLog = Math.log10(Math.max(maxRange, 100));
      const yRatio = 1 - (logDist / maxLog);
      c.targetY = skyTop + yRatio * (skyBottom - skyTop);

      // Horizontal: dish azimuth mapped to spread zone
      // Azimuth 0-360 -> -0.5 to +0.5 offset from center
      const azNorm = ((c.azimuth % 360) / 360 - 0.5);
      c.targetX = Math.min(W - 60, Math.max(60, fanCenterX + azNorm * spread));
    });
  });

  // Nudge overlapping spacecraft apart
  const charW = isMobile ? 7 : 5.5;
  const minDy = isMobile ? 22 : 18;
  const allConns = conns.slice().sort((a, b) => a.targetY - b.targetY || a.targetX - b.targetX);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < allConns.length; i++) {
      for (let j = i + 1; j < allConns.length; j++) {
        const a = allConns[i], b = allConns[j];
        const nameA = (spacecraftNames[a.scId] || a.scId).length;
        const nameB = (spacecraftNames[b.scId] || b.scId).length;
        const minDx = (nameA + nameB) / 2 * charW;
        const dx = Math.abs(a.targetX - b.targetX);
        const dy = Math.abs(a.targetY - b.targetY);
        if (dx < minDx && dy < minDy) {
          const pushY = (minDy - dy) / 2 + 0.5;
          a.targetY -= pushY;
          b.targetY += pushY;
        }
      }
    }
  }

  // Carry over render positions from previous frame for smooth interpolation
  const prevMap = {};
  connections.forEach(c => { prevMap[c.scId + ':' + c.dish] = c; });

  conns.forEach(c => {
    const prev = prevMap[c.scId + ':' + c.dish];
    if (prev) {
      c.renderX = prev.renderX;
      c.renderY = prev.renderY;
    } else {
      c.renderX = c.targetX;
      c.renderY = c.targetY;
    }
  });

  connections = conns;

  // Keep mobile tooltip reference in sync with new connection objects
  if (activeTooltipConn) {
    const match = conns.find(c => c.scId === activeTooltipConn.scId && c.dish === activeTooltipConn.dish);
    activeTooltipConn = match || null;
    if (!match) tooltip.classList.remove('visible');
  }

  // Update active count
  const activeCount = conns.filter(c => c.hasActiveUp || c.hasActiveDown).length;
  document.getElementById('active-count').textContent = activeCount + ' active links';

  // Update data rate and power stats
  dataRateTarget = conns
    .filter(c => c.hasActiveDown)
    .reduce((sum, c) => sum + (c.dataRate || 0), 0);
  powerTarget = conns
    .filter(c => c.hasActiveUp)
    .reduce((sum, c) => sum + (c.upPower || 0), 0);
}
