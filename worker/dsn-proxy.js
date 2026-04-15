// WhisperDSN — Cloudflare Worker
// Proxies NASA's DSN XML feed as JSON with CORS headers
// Merges spacecraft names from NASA's config.xml

const DSN_URL = 'https://eyes.jpl.nasa.gov/dsn/data/dsn.xml';
const CONFIG_URL = 'https://eyes.nasa.gov/apps/dsn-now/config.xml';
const DSN_CACHE_SECONDS = 5;
const CONFIG_CACHE_SECONDS = 2592000; // 30 days

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

// In-memory config cache (persists across requests within same isolate)
let cachedConfig = null;
let configFetchedAt = 0;

export default {
  async fetch(request) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Block requests without a valid origin/referer
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o) || referer.startsWith(o));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check edge cache first
    const cache = caches.default;
    const cacheKey = new Request(new URL('/', request.url).href, request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      // Fetch DSN data and config in parallel
      const [dsnResp, spacecraft] = await Promise.all([
        fetch(DSN_URL, { headers: { 'User-Agent': 'WhisperDSN/1.0' } }),
        getSpacecraftConfig(),
      ]);

      if (!dsnResp.ok) {
        return jsonResponse({ error: 'DSN feed unavailable', status: dsnResp.status }, 502, corsHeaders);
      }

      const xml = await dsnResp.text();
      const data = parseXML(xml);
      data.spacecraft = spacecraft;

      const response = jsonResponse(data, 200, corsHeaders, {
        'Cache-Control': `public, max-age=${DSN_CACHE_SECONDS}`,
      });

      await cache.put(cacheKey, response.clone());
      return response;
    } catch (e) {
      return jsonResponse({ error: 'Failed to fetch DSN data', detail: e.message }, 502, corsHeaders);
    }
  },
};

// Fetch and cache spacecraft names from NASA's config.xml
async function getSpacecraftConfig() {
  const now = Date.now();
  if (cachedConfig && (now - configFetchedAt) < CONFIG_CACHE_SECONDS * 1000) {
    return cachedConfig;
  }

  try {
    const resp = await fetch(CONFIG_URL, {
      headers: { 'User-Agent': 'WhisperDSN/1.0' },
    });
    if (resp.ok) {
      const xml = await resp.text();
      cachedConfig = parseConfig(xml);
      configFetchedAt = now;
      return cachedConfig;
    }
  } catch (e) {}

  // Return whatever we had, or empty
  return cachedConfig || {};
}

// Parse config.xml — extracts spacecraft ID → display name mapping
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

// Lightweight XML parser for DSN feed
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
