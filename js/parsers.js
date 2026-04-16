// ── XML Parser (for embedded snapshot fallback) ──────────────────────
function parseDSN(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const dishEls = doc.querySelectorAll('dish');
  const newConnections = [];

  dishEls.forEach(dish => {
    let prev = dish.previousElementSibling;
    while (prev && prev.tagName !== 'station') prev = prev.previousElementSibling;
    if (!prev) {
      let node = dish;
      while (node.previousElementSibling) {
        node = node.previousElementSibling;
        if (node.tagName === 'station') { prev = node; break; }
      }
    }
    if (!prev) return;

    const stationId = prev.getAttribute('name');
    const stationPos = stationPositions.find(p => p.id === stationId);
    if (!stationPos) return;

    const dishName = dish.getAttribute('name');
    const activity = dish.getAttribute('activity');
    const azimuth = parseFloat(dish.getAttribute('azimuthAngle')) || 0;
    const elevation = parseFloat(dish.getAttribute('elevationAngle')) || 0;
    const targets = dish.querySelectorAll('target');
    const upSignals = dish.querySelectorAll('upSignal');
    const downSignals = dish.querySelectorAll('downSignal');

    targets.forEach(target => {
      const scId = target.getAttribute('name');
      if (['DSN', 'DSS', 'GBRA', 'TEST', 'DOUG', 'SHAN'].includes(scId)) return;

      const range = parseFloat(target.getAttribute('downlegRange'));
      const rtlt = parseFloat(target.getAttribute('rtlt'));
      if (range <= 0) return;

      const scSignals = s => s.getAttribute('spacecraft') === scId;
      const hasActiveUp = Array.from(upSignals).filter(scSignals).some(s => s.getAttribute('active') === 'true');
      const hasActiveDown = Array.from(downSignals).filter(scSignals).some(s => s.getAttribute('active') === 'true');
      const maxDataRate = Math.max(0,
        ...Array.from(downSignals).filter(scSignals).map(s => parseFloat(s.getAttribute('dataRate')) || 0),
        ...Array.from(upSignals).filter(scSignals).map(s => parseFloat(s.getAttribute('dataRate')) || 0)
      );
      const scDownArr = Array.from(downSignals).filter(scSignals);
      const scUpArr = Array.from(upSignals).filter(scSignals);
      const band = (scDownArr[0] || scUpArr[0] || { getAttribute: () => '' }).getAttribute('band') || '';

      newConnections.push({
        station: stationPos, dish: dishName, scId, range, rtlt,
        hasActiveUp, hasActiveDown, activity, dataRate: maxDataRate, band,
        upPower: scUpArr.reduce((max, s) => Math.max(max, parseFloat(s.getAttribute('power')) || 0), 0),
        azimuth, elevation,
        targetX: 0, targetY: 0, renderX: 0, renderY: 0,
      });
    });
  });

  const ts = doc.querySelector('timestamp');
  if (ts) {
    const d = new Date(parseInt(ts.textContent));
    document.getElementById('timestamp').textContent = d.toUTCString().replace('GMT', 'UTC');
  }

  layoutConnections(newConnections);
}

// ── JSON Parser (for Worker endpoint) ────────────────────────────────
function parseDSNJSON(data) {
  const newConnections = [];

  if (data.timestamp) {
    const d = new Date(data.timestamp);
    document.getElementById('timestamp').textContent = d.toUTCString().replace('GMT', 'UTC');
  }

  (data.stations || []).forEach(station => {
    const stationPos = stationPositions.find(p => p.id === station.id);
    if (!stationPos) return;

    // Track all dishes and station info
    stationDishes[station.id] = (station.dishes || []).map(d => d.name);
    const dishActivity = {};
    (station.dishes || []).forEach(d => { dishActivity[d.name] = d.activity || ''; });
    stationInfo[station.id] = {
      tzOffset: station.timeZoneOffset || 0,
      dishActivity,
    };

    (station.dishes || []).forEach(dish => {
      (dish.targets || []).forEach(target => {
        newConnections.push({
          station: stationPos,
          dish: dish.name,
          scId: target.id,
          range: target.downlegRange,
          rtlt: target.rtlt,
          hasActiveUp: target.upSignalActive,
          hasActiveDown: target.downSignalActive,
          activity: dish.activity,
          dataRate: target.dataRate,
          band: target.band || '',
          upPower: target.upPower || 0,
          azimuth: dish.azimuth || 0,
          elevation: dish.elevation || 0,
          targetX: 0, targetY: 0, renderX: 0, renderY: 0,
        });
      });
    });
  });

  layoutConnections(newConnections);
}
