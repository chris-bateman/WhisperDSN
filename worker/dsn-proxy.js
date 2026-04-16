// WhisperDSN — Cloudflare Worker
// Endpoints:
//   GET /            — DSN live data (5s edge cache)
//   GET /spacecraft  — spacecraft name map from NASA config.xml (24hr edge cache)
//   GET /distances   — real planet distances from JPL Horizons (24hr edge cache)
//   GET /news?sc=XX  — latest mission news from NASA RSS feeds (4hr edge cache)

const DSN_URL = 'https://eyes.jpl.nasa.gov/dsn/data/dsn.xml';
const CONFIG_URL = 'https://eyes.nasa.gov/apps/dsn-now/config.xml';
const DSN_CACHE_SECONDS = 5;
const CONFIG_CACHE_SECONDS = 86400; // 24 hours
const DISTANCES_CACHE_SECONDS = 86400; // 24 hours
const NEWS_CACHE_SECONDS = 14400; // 4 hours

const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const AU_TO_KM = 149597870.7;

// Horizons body IDs for geocentric distance queries
const HORIZONS_BODIES = {
  Moon: '301', Mercury: '199', Venus: '299', Mars: '499',
  Sun: '10', Jupiter: '599', Saturn: '699', Uranus: '799', Neptune: '899',
};

// DSN spacecraft code → NASA RSS feed slug
const NEWS_FEEDS = {
  JWST: 'missions/webb/feed/',
  M20:  'missions/mars-2020-perseverance/perseverance-rover/feed/',
  MSL:  'missions/mars-science-laboratory/curiosity-rover/feed/',
  JNO:  'missions/juno/feed/',
  VGR1: 'missions/voyager-program/feed/',
  VGR2: 'missions/voyager-program/feed/',
  NHPC: 'missions/new-horizons/feed/',
  SPP:  'missions/parker-solar-probe/feed/',
};

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
    if (url.pathname === '/distances') {
      return handleDistances(request, corsHeaders);
    }
    if (url.pathname === '/news') {
      return handleNews(request, url, corsHeaders);
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

// ── GET /distances — Real planet distances from JPL Horizons ────────
async function handleDistances(request, corsHeaders) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/distances', request.url).href);
  const cached = await cache.match(cacheKey);
  if (cached) return addCors(cached, corsHeaders);

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const distances = {};

    for (const [name, id] of Object.entries(HORIZONS_BODIES)) {
      try {
        const params = new URLSearchParams({
          format: 'json', COMMAND: `'${id}'`, OBJ_DATA: "'NO'",
          MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'",
          START_TIME: `'${today}'`, STOP_TIME: `'${tomorrow}'`,
          STEP_SIZE: "'1d'", QUANTITIES: "'20'",
        });
        const resp = await fetch(`${HORIZONS_URL}?${params}`, {
          headers: { 'User-Agent': 'WhisperDSN/1.0' },
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        const text = data.result || '';
        const soeIdx = text.indexOf('$$SOE');
        const eoeIdx = text.indexOf('$$EOE');
        if (soeIdx < 0 || eoeIdx < 0) continue;
        const line = text.substring(soeIdx + 5, eoeIdx).trim().split('\n')[0];
        const delta = parseFloat(line.trim().split(/\s+/)[2]);
        if (!isNaN(delta)) distances[name] = Math.round(delta * AU_TO_KM);
      } catch (_) { /* skip this body */ }
    }

    const response = jsonResponse(distances, 200, corsHeaders, {
      'Cache-Control': `public, max-age=${DISTANCES_CACHE_SECONDS}`,
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return jsonResponse({}, 200, corsHeaders);
  }
}

// ── GET /news?sc=XX — Mission news from NASA RSS feeds ─────────────
async function handleNews(request, url, corsHeaders) {
  const sc = (url.searchParams.get('sc') || '').toUpperCase();
  if (!sc) return jsonResponse([], 200, corsHeaders);

  const cache = caches.default;
  const cacheKey = new Request(new URL(`/news?sc=${sc}`, request.url).href);
  const cached = await cache.match(cacheKey);
  if (cached) return addCors(cached, corsHeaders);

  try {
    const feedSlug = NEWS_FEEDS[sc];
    if (!feedSlug) return jsonResponse([], 200, corsHeaders);

    const resp = await fetch(`https://www.nasa.gov/${feedSlug}`, {
      headers: { 'User-Agent': 'WhisperDSN/1.0' },
    });
    if (!resp.ok) return jsonResponse([], 200, corsHeaders);

    const xml = await resp.text();
    const items = parseRSS(xml);

    const response = jsonResponse(items, 200, corsHeaders, {
      'Cache-Control': `public, max-age=${NEWS_CACHE_SECONDS}`,
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    return jsonResponse([], 200, corsHeaders);
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
      timeZoneOffset: parseInt(stationAttrs.timeZoneOffset) || 0,
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
        azimuth: parseFloat(dishAttrs.azimuthAngle) || 0,
        elevation: parseFloat(dishAttrs.elevationAngle) || 0,
        targets: [],
      };

      const upSignals = parseSignals(dishBody, 'upSignal');
      const downSignals = parseSignals(dishBody, 'downSignal');

      const targetRegex = /<target\s+([^>]+)\/>/g;
      let targetMatch;
      while ((targetMatch = targetRegex.exec(dishBody)) !== null) {
        const tAttrs = parseAttrs(targetMatch[1]);
        const id = tAttrs.name || '';
        const range = parseFloat(tAttrs.downlegRange) || -1;
        const rtlt = parseFloat(tAttrs.rtlt) || -1;

        if (['DSN', 'DSS', 'GBRA', 'TEST', 'DOUG', 'SHAN'].includes(id)) continue;
        if (range <= 0) continue;

        const scUp = upSignals.filter(s => s.spacecraft === id);
        const scDown = downSignals.filter(s => s.spacecraft === id);
        const scAll = [...scUp, ...scDown];

        dish.targets.push({
          id,
          downlegRange: range,
          rtlt,
          upSignalActive: scUp.some(s => s.active === 'true'),
          downSignalActive: scDown.some(s => s.active === 'true'),
          dataRate: scAll.reduce((max, s) => Math.max(max, parseFloat(s.dataRate) || 0), 0),
          band: (scDown[0] || scUp[0] || {}).band || '',
          upPower: scUp.reduce((max, s) => Math.max(max, parseFloat(s.power) || 0), 0),
        });
      }

      station.dishes.push(dish);
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

// ── RSS parser ──────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
    const body = match[1];
    const title = (body.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const link = (body.match(/<link>(.*?)<\/link>/) || [])[1] || '';
    const pubDate = (body.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    const clean = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    if (!clean) continue;
    items.push({ title: clean, link, date: pubDate });
  }
  return items;
}
