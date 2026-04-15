// WhisperDSN — Cloudflare Worker
// Proxies NASA's DSN XML feed as JSON with CORS headers

const DSN_URL = 'https://eyes.jpl.nasa.gov/dsn/data/dsn.xml';
const CACHE_SECONDS = 5;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Check cache first
    const cache = caches.default;
    const cacheKey = new Request(new URL('/', request.url).href, request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const resp = await fetch(DSN_URL, {
        headers: { 'User-Agent': 'WhisperDSN/1.0' },
      });

      if (!resp.ok) {
        return jsonResponse({ error: 'DSN feed unavailable', status: resp.status }, 502);
      }

      const xml = await resp.text();
      const data = parseXML(xml);
      const response = jsonResponse(data, 200, {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      });

      // Store in edge cache
      await cache.put(cacheKey, response.clone());
      return response;
    } catch (e) {
      return jsonResponse({ error: 'Failed to fetch DSN data', detail: e.message }, 502);
    }
  },
};

function jsonResponse(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// Lightweight XML parser for DSN feed
// The XML structure is flat and predictable, so regex works fine within 10ms CPU
function parseXML(xml) {
  const result = { timestamp: null, stations: [] };

  // Extract timestamp
  const tsMatch = xml.match(/<timestamp>(\d+)<\/timestamp>/);
  if (tsMatch) result.timestamp = parseInt(tsMatch[1]);

  // Split into station sections
  // Each <station> tag is followed by its dishes until the next <station> or end
  const stationRegex = /<station\s+([^>]+)\/>/g;
  const stationMatches = [...xml.matchAll(stationRegex)];

  for (let si = 0; si < stationMatches.length; si++) {
    const stationAttrs = parseAttrs(stationMatches[si][1]);
    const station = {
      id: stationAttrs.name || '',
      friendlyName: stationAttrs.friendlyName || '',
      dishes: [],
    };

    // Get the XML between this station and the next (or end of dsn)
    const startIdx = stationMatches[si].index;
    const endIdx = si + 1 < stationMatches.length
      ? stationMatches[si + 1].index
      : xml.indexOf('</dsn>') !== -1 ? xml.indexOf('</dsn>') : xml.length;
    const section = xml.substring(startIdx, endIdx);

    // Parse dishes in this section
    const dishRegex = /<dish\s+([^>]+)>([\s\S]*?)<\/dish>/g;
    let dishMatch;
    while ((dishMatch = dishRegex.exec(section)) !== null) {
      const dishAttrs = parseAttrs(dishMatch[1]);
      const dishBody = dishMatch[2];
      const dish = {
        name: dishAttrs.name || '',
        activity: dishAttrs.activity || '',
        targets: [],
      };

      // Parse signals
      const upSignals = parseSignals(dishBody, 'upSignal');
      const downSignals = parseSignals(dishBody, 'downSignal');

      const hasActiveUp = upSignals.some(s => s.active === 'true');
      const hasActiveDown = downSignals.some(s => s.active === 'true');

      const allSignals = [...upSignals, ...downSignals];
      const maxDataRate = allSignals.reduce((max, s) => {
        const rate = parseFloat(s.dataRate) || 0;
        return rate > max ? rate : max;
      }, 0);

      // Parse targets
      const targetRegex = /<target\s+([^>]+)\/>/g;
      let targetMatch;
      while ((targetMatch = targetRegex.exec(dishBody)) !== null) {
        const tAttrs = parseAttrs(targetMatch[1]);
        const id = tAttrs.name || '';
        const range = parseFloat(tAttrs.downlegRange) || -1;
        const rtlt = parseFloat(tAttrs.rtlt) || -1;

        // Skip internal/test targets
        if (['DSN', 'DSS', 'GBRA', 'TEST', 'DOUG', 'SHAN'].includes(id)) continue;
        if (range <= 0) continue;

        dish.targets.push({
          id,
          downlegRange: range,
          rtlt,
          upSignalActive: hasActiveUp,
          downSignalActive: hasActiveDown,
          dataRate: maxDataRate,
        });
      }

      if (dish.targets.length > 0) {
        station.dishes.push(dish);
      }
    }

    result.stations.push(station);
  }

  return result;
}

function parseSignals(dishBody, tagName) {
  const regex = new RegExp(`<${tagName}\\s+([^>]+)\\/>`, 'g');
  const signals = [];
  let match;
  while ((match = regex.exec(dishBody)) !== null) {
    signals.push(parseAttrs(match[1]));
  }
  return signals;
}

function parseAttrs(str) {
  const attrs = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}
