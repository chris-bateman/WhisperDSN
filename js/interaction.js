// ── Hover / Tooltip ──────────────────────────────────────────────────
function checkHover() {
  if (mouseX < 0 && !activeTooltipConn) return;
  // On mobile with an active tooltip, keep showing it without requiring mouseX
  if (isMobile && activeTooltipConn) {
    const c = activeTooltipConn;
    const scName = spacecraftNames[c.scId];
    document.getElementById('tt-name').textContent = scName || c.scId;
    document.getElementById('tt-meta').textContent = c.dish + ' \u2192 ' + c.station.name;
    document.getElementById('tt-detail').textContent = connectionDetail(c);
    showNewsInTooltip(c.scId);
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.top = '70px';
    tooltip.classList.add('visible');
    return;
  }
  if (mouseX < 0) return;
  let found = null;
  let minDist = isMobile ? 35 : 20;

  connections.forEach(c => {
    const dx = mouseX - c.renderX;
    const dy = mouseY - c.renderY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      found = c;
    }
  });

  if (found) {
    const scName = spacecraftNames[found.scId];
    document.getElementById('tt-name').textContent = scName || found.scId;
    document.getElementById('tt-meta').textContent = found.dish + ' \u2192 ' + found.station.name;

    document.getElementById('tt-detail').textContent = connectionDetail(found);
    showNewsInTooltip(found.scId);

    showTooltip();
    return;
  }

  // Check planet hover
  let hoveredPlanet = null;
  drawnPlanets.forEach(p => {
    const dx = mouseX - p.x;
    const dy = mouseY - p.y;
    if (Math.sqrt(dx * dx + dy * dy) < (isMobile ? 25 : 18)) hoveredPlanet = p;
  });

  if (hoveredPlanet) {
    const p = hoveredPlanet;
    const planetData = PLANET_BY_NAME[p.name];
    document.getElementById('tt-name').textContent = p.name;
    document.getElementById('tt-meta').textContent = formatDistance(planetData ? planetData.distance : 0) + ' from Earth' + (planetDistancesLive ? '' : ' (avg)');

    const scList = p.spacecraft.map(id => spacecraftNames[id] || id);
    const active = p.spacecraft.filter(id =>
      connections.some(c => c.scId === id && (c.hasActiveUp || c.hasActiveDown))
    ).length;
    let detail = scList.join(', ');
    if (active > 0) detail += '\n' + active + ' actively communicating';
    document.getElementById('tt-detail').textContent = detail;
    document.getElementById('tt-desc').textContent = '';

    showTooltip();
    return;
  }

  // Check station hover
  let hoveredStation = null;
  stationPositions.forEach(s => {
    const dx = mouseX - s.x;
    const dy = mouseY - s.y;
    if (Math.abs(dx) < 80 && dy > -20 && dy < 50) {
      hoveredStation = s;
    }
  });

  if (hoveredStation) {
    const s = hoveredStation;
    const info = stationInfo[s.id];
    document.getElementById('tt-name').textContent = s.name;

    // Local time
    let meta = s.loc;
    if (info && info.tzOffset !== undefined) {
      const localMs = Date.now() + info.tzOffset;
      const local = new Date(localMs);
      const hh = String(local.getUTCHours()).padStart(2, '0');
      const mm = String(local.getUTCMinutes()).padStart(2, '0');
      meta += ' — ' + hh + ':' + mm + ' local';
    }
    document.getElementById('tt-meta').textContent = meta;

    // Dish status (use innerHTML for colour coding)
    const dishes = stationDishes[s.id] || [];
    let detail = '';
    dishes.forEach(dish => {
      const activity = (info && info.dishActivity && info.dishActivity[dish]) || 'Unknown';
      const active = connections.some(c => c.station.id === s.id && c.dish === dish && (c.hasActiveUp || c.hasActiveDown));
      const num = dish.replace('DSS', '');
      const color = active ? '#6abf8a' : dishColor(activity);
      const label = active ? 'Active' : activity;
      detail += '<span style="color:' + color + '">' + num + ': ' + label + '</span><br>';
    });
    document.getElementById('tt-detail').innerHTML = detail;

    // Last tracked
    const seen = loadSeen();
    const stationSeen = Object.entries(seen)
      .filter(([, d]) => d.stationId === s.id)
      .sort((a, b) => b[1].ts - a[1].ts)
      .slice(0, 3);
    if (stationSeen.length > 0) {
      const lastLines = stationSeen.map(([id, d]) => {
        const ago = Math.round((Date.now() - d.ts) / 60000);
        const name = spacecraftNames[id] || id;
        const agoStr = ago < 1 ? 'just now' : ago < 60 ? ago + 'm ago' : Math.round(ago / 60) + 'h ago';
        return name + ' — ' + agoStr;
      });
      document.getElementById('tt-desc').textContent = 'Recent: ' + lastLines.join(', ');
    } else {
      document.getElementById('tt-desc').textContent = '';
    }

    showTooltip();
    return;
  }

  if (!tooltipHovered) {
    if (tooltip.classList.contains('has-links')) {
      if (!tooltipHideTimer) {
        tooltipHideTimer = setTimeout(() => {
          if (!tooltipHovered) tooltip.classList.remove('visible', 'has-links');
          tooltipHideTimer = null;
        }, 300);
      }
    } else {
      tooltip.classList.remove('visible');
    }
  }

  function showTooltip() {
    if (tooltipHideTimer) { clearTimeout(tooltipHideTimer); tooltipHideTimer = null; }
    if (isMobile) {
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.top = '70px';
    } else {
      tooltip.style.transform = 'none';
      tooltip.style.left = Math.min(mouseX + 16, W - 280) + 'px';
      // Position above cursor if near bottom of screen
      const ttHeight = tooltip.offsetHeight || 200;
      const top = mouseY + ttHeight + 20 > H ? mouseY - ttHeight - 10 : mouseY - 20;
      tooltip.style.top = Math.max(top, 10) + 'px';
    }
    tooltip.classList.add('visible');
  }
}

canvas.addEventListener('mousemove', e => {
  if (gameState) return;
  mouseX = e.clientX;
  mouseY = e.clientY;
});
let tooltipHideTimer = null;
let tooltipHovered = false;

tooltip.addEventListener('mouseenter', () => {
  tooltipHovered = true;
  if (tooltipHideTimer) { clearTimeout(tooltipHideTimer); tooltipHideTimer = null; }
});
tooltip.addEventListener('mouseleave', () => {
  tooltipHovered = false;
  tooltip.classList.remove('visible', 'has-links');
});

canvas.addEventListener('mouseleave', () => {
  mouseX = -1;
  if (tooltip.classList.contains('has-links')) {
    tooltipHideTimer = setTimeout(() => {
      if (!tooltipHovered) tooltip.classList.remove('visible', 'has-links');
      tooltipHideTimer = null;
    }, 300);
  } else {
    tooltip.classList.remove('visible');
  }
});

// ── News in Tooltip ─────────────────────────────────────────────────
const MISSION_LINKS = {
  JWST: 'nasa.gov/mission/webb', M20: 'nasa.gov/mission/mars-2020-perseverance',
  MSL: 'nasa.gov/mission/msl-curiosity', JNO: 'nasa.gov/mission/juno',
  VGR1: 'nasa.gov/mission/voyager-interstellar-mission', VGR2: 'nasa.gov/mission/voyager-interstellar-mission',
  NHPC: 'nasa.gov/mission/new-horizons', SPP: 'nasa.gov/mission/parker-solar-probe',
  MRO: 'nasa.gov/mission/mro', M01O: 'nasa.gov/mission/mars-odyssey',
  MVN: 'nasa.gov/mission/maven', MEX: 'esa.int/mars-express',
  TGO: 'esa.int/exomars-tgo', BEPI: 'esa.int/bepicolombo',
  SOHO: 'nasa.gov/mission/soho', STA: 'nasa.gov/mission/stereo',
  LRO: 'nasa.gov/mission/lro', KPLO: 'kari.re.kr',
  CHDR: 'nasa.gov/mission/chandra', HST: 'nasa.gov/mission/hubble',
  XMM: 'esa.int/xmm-newton', TESS: 'nasa.gov/mission/tess',
  GAIA: 'esa.int/gaia', EURC: 'esa.int/euclid',
  PSYC: 'nasa.gov/mission/psyche', LUCY: 'nasa.gov/mission/lucy',
  DSCO: 'nasa.gov/mission/dscovr',
};

function showNewsInTooltip(scId) {
  const desc = document.getElementById('tt-desc');
  const missionLink = MISSION_LINKS[scId]
    ? '<a href="https://' + MISSION_LINKS[scId] + '" target="_blank" rel="noopener">' + MISSION_LINKS[scId] + '</a>'
    : '';
  const cached = newsCache[scId];
  if (cached && cached.length > 0) {
    desc.innerHTML = formatNewsItem(cached[0]) + (missionLink ? '\n' + missionLink : '');
  } else if (cached === undefined) {
    desc.innerHTML = missionLink;
    fetchNews(scId).then(items => {
      if (items.length > 0) {
        desc.innerHTML = formatNewsItem(items[0]) + (missionLink ? '\n' + missionLink : '');
      }
      updateTooltipLinks();
    });
  } else {
    desc.innerHTML = missionLink;
  }
  updateTooltipLinks();
}

function updateTooltipLinks() {
  const hasLinks = tooltip.querySelector('.sc-desc a');
  tooltip.classList.toggle('has-links', !!hasLinks);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNewsItem(item) {
  const ago = timeAgo(new Date(item.date));
  const title = item.title.length > 60 ? item.title.slice(0, 57) + '...' : item.title;
  const text = escapeHtml(title) + (ago ? ' \u00b7 ' + ago : '');
  return '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">' + text + '</a>';
}

function timeAgo(date) {
  const ms = Date.now() - date.getTime();
  if (isNaN(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  return months + 'mo ago';
}

// ── Touch Events ────────────────────────────────────────────────────
function findNearestSpacecraft(x, y, radius) {
  let found = null;
  let minDist = radius;
  connections.forEach(c => {
    const dx = x - c.renderX;
    const dy = y - c.renderY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      found = c;
    }
  });
  return found;
}

canvas.addEventListener('touchstart', e => {
  if (gameState) return;
  e.preventDefault();
  const touch = e.touches[0];
  mouseX = touch.clientX;
  mouseY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  if (gameState) return;
  e.preventDefault();
  const touch = e.touches[0];
  mouseX = touch.clientX;
  mouseY = touch.clientY;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  if (gameState) return;
  e.preventDefault();
  if (hitTestEasterRock(mouseX, mouseY)) { activateGame(); return; }
  const found = findNearestSpacecraft(mouseX, mouseY, 35);

  if (found) {
    // If tapping the same spacecraft that already has tooltip, fire a light pulse
    if (activeTooltipConn && activeTooltipConn.scId === found.scId && activeTooltipConn.dish === found.dish) {
      fireLightPulse(found);
      activeTooltipConn = null;
      tooltip.classList.remove('visible');
    } else {
      // First tap — show tooltip
      activeTooltipConn = found;
    }
  } else {
    // Tapped empty space — dismiss tooltip
    activeTooltipConn = null;
    tooltip.classList.remove('visible');
  }
  mouseX = -1;
}, { passive: false });

// ── Light Pulse — click/tap to send a pulse at proportional light speed ──
let lightPulses = [];
const MAX_PULSE_DURATION = 30; // cap animation at 30 real seconds
let hintShown = false;

function fireLightPulse(found) {
  document.getElementById('pulse-hint').classList.remove('visible');
  hintShown = true;

  const owlt = found.rtlt > 0 ? found.rtlt / 2 : 1;
  const duration = Math.min(owlt, MAX_PULSE_DURATION);
  const timeScale = owlt / duration;

  const dp = getDishPos(found.station.id, found.dish);
  lightPulses.push({
    sx: dp.x,
    sy: dp.y,
    tx: found.renderX,
    ty: found.renderY,
    startTime: performance.now(),
    duration: duration * 1000,
    owlt,
    timeScale,
    scId: found.scId,
    name: spacecraftNames[found.scId] || found.scId,
  });
}

canvas.addEventListener('click', e => {
  if (gameState) return;
  if (hitTestEasterRock(e.clientX, e.clientY)) { activateGame(); return; }
  const found = findNearestSpacecraft(e.clientX, e.clientY, isMobile ? 35 : 30);
  if (found) fireLightPulse(found);
});
