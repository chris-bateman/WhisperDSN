// WhisperDSN — Cloudflare Worker
// Two endpoints:
//   GET /            — DSN live data (5s edge cache)
//   GET /spacecraft  — spacecraft name map from NASA config.xml (24hr edge cache)

const DSN_URL = 'https://eyes.jpl.nasa.gov/dsn/data/dsn.xml';
const CONFIG_URL = 'https://eyes.nasa.gov/apps/dsn-now/config.xml';
const DSN_CACHE_SECONDS = 5;
const CONFIG_CACHE_SECONDS = 86400; // 24 hours

const ALLOWED_ORIGINS = [
  'https://whisper.chrisb.cloud',
  'https://whisperdsn.pages.dev',
  'http://localhost',
  'http://127.0.0.1',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request) {
    const corsHeaders = getCorsHeaders(request);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Block requests without a valid origin/referer
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o) || referer.startsWith(o));
    if (!isAllowed) {
      return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);
    }

    if (url.pathname === '/spacecraft') {
      return handleSpacecraft(request, corsHeaders);
    }
    return handleDSN(request, corsHeaders);
  },
};

// ── GET / — Live DSN data ────────────────────────────────────────────
async function handleDSN(request, corsHeaders) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/', request.url).href);
  const cached = await cache.match(cacheKey);
  if (cached) return addCors(cached, corsHeaders);

  try {
    const resp = await fetch(DSN_URL, {
      headers: { 'User-Agent': 'WhisperDSN/1.0' },
    });

    if (!resp.ok) {
      return jsonResponse({ error: 'DSN feed unavailable', status: resp.status }, 502, corsHeaders);
    }

    const xml = await resp.text();
    const data = parseXML(xml);
    const response = jsonResponse(data, 200, corsHeaders, {
      'Cache-Control': `public, max-age=${DSN_CACHE_SECONDS}`,
    });

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return jsonResponse({ error: 'Failed to fetch DSN data', detail: e.message }, 502, corsHeaders);
  }
}

// ── GET /spacecraft — Name map from config.xml ───────────────────────
async function handleSpacecraft(request, corsHeaders) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/spacecraft', request.url).href);
  const cached = await cache.match(cacheKey);
  if (cached) return addCors(cached, corsHeaders);

  try {
    const resp = await fetch(CONFIG_URL, {
      headers: { 'User-Agent': 'WhisperDSN/1.0' },
    });

    if (!resp.ok) {
      return jsonResponse({}, 200, corsHeaders);
    }

    const xml = await resp.text();
    const spacecraft = parseConfig(xml);
    const response = jsonResponse(spacecraft, 200, corsHeaders, {
      'Cache-Control': `public, max-age=${CONFIG_CACHE_SECONDS}`,
    });

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return jsonResponse({}, 200, corsHeaders);
  }
}

// Clone a cached response with fresh CORS headers
function addCors(response, corsHeaders) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

function jsonResponse(data, status, corsHeaders, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

// ── Config parser ────────────────────────────────────────────────────
function parseConfig(xml) {
  const spacecraft = {};
  const regex = /<spacecraft\s+([^>]+)\/?>|<spacecraft\s+([^>]+)>[^<]*<\/spacecraft>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const attrStr = match[1] || match[2];
    const attrs = parseAttrs(attrStr);
    if (attrs.name && attrs.friendlyName) {
      spacecraft[attrs.name.toUpperCase()] = attrs.friendlyName;
    }
  }
  return spacecraft;
}

// ── DSN XML parser ───────────────────────────────────────────────────
function parseXML(xml) {
  const result = { timestamp: null, stations: [] };

  const tsMatch = xml.match(/<timestamp>(\d+)<\/timestamp>/);
  if (tsMatch) result.timestamp = parseInt(tsMatch[1]);

  const stationRegex = /<station\s+([^>]+)\/>/g;
  const stationMatches = [...xml.matchAll(stationRegex)];

  for (let si = 0; si < stationMatches.length; si++) {
    const stationAttrs = parseAttrs(stationMatches[si][1]);
    const station = {
      id: stationAttrs.name || '',
      friendlyName: stationAttrs.friendlyName || '',
      dishes: [],
    };

    const startIdx = stationMatches[si].index;
    const endIdx = si + 1 < stationMatches.length
      ? stationMatches[si + 1].index
      : xml.indexOf('</dsn>') !== -1 ? xml.indexOf('</dsn>') : xml.length;
    const section = xml.substring(startIdx, endIdx);

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

      const upSignals = parseSignals(dishBody, 'upSignal');
      const downSignals = parseSignals(dishBody, 'downSignal');

      const hasActiveUp = upSignals.some(s => s.active === 'true');
      const hasActiveDown = downSignals.some(s => s.active === 'true');

      const allSignals = [...upSignals, ...downSignals];
      const maxDataRate = allSignals.reduce((max, s) => {
        const rate = parseFloat(s.dataRate) || 0;
        return rate > max ? rate : max;
      }, 0);

      const targetRegex = /<target\s+([^>]+)\/>/g;
      let targetMatch;
      while ((targetMatch = targetRegex.exec(dishBody)) !== null) {
        const tAttrs = parseAttrs(targetMatch[1]);
        const id = tAttrs.name || '';
        const range = parseFloat(tAttrs.downlegRange) || -1;
        const rtlt = parseFloat(tAttrs.rtlt) || -1;

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
