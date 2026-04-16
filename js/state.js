// ── Spacecraft Names ─────────────────────────────────────────────────
// Dynamically populated from Worker (sourced from NASA's config.xml)
// Fallback names used only for embedded snapshot
let spacecraftNames = {};

// ── Worker endpoint ──────────────────────────────────────────────────
// Update this after deploying the Cloudflare Worker
const WORKER_URL = 'https://dsn-proxy.chris-bateman.workers.dev/';

// ── Station Dishes (populated from live feed) ────────────────────────
let stationDishes = {};
let stationInfo = {};   // { id: { tzOffset, dishActivity: { dishName: activity } } }

// ── Canvas & State ───────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

let W, H;
let connections = [];
let particles = [];
let stars = [];
let mouseX = -1, mouseY = -1;
let dataRateTarget = 0, dataRateDisplay = 0;
let powerTarget = 0, powerDisplay = 0;
let isMobile = false;
let isShortScreen = false;
let activeTooltipConn = null;
let stationPositions = [];
const MAX_LOG_RANGE = Math.log10(25e9); // ~Voyager distance
let currentMaxRange = 25e9; // updated from layoutConnections

// ── Planet Distance Markers ─────────────────────────────────────────
const PLANET_MARKERS = [
  { name: 'Mercury', distance: 91.7e6,  color: '#8c7e6d', radius: 2.5 },
  { name: 'Venus',   distance: 41.4e6,  color: '#c9a96e', radius: 3.5 },
  { name: 'Moon',    distance: 384400,   color: '#a0a0a0', radius: 2 },
  { name: 'Mars',    distance: 225e6,    color: '#c0603a', radius: 3 },
  { name: 'Sun',     distance: 150e6,    color: '#ffc83c', radius: 5 },
  { name: 'Jupiter', distance: 778e6,    color: '#c8a55a', radius: 6 },
  { name: 'Saturn',  distance: 1.4e9,    color: '#d4b86a', radius: 5, ring: true },
  { name: 'Uranus',  distance: 2.87e9,   color: '#6bb5c9', radius: 4 },
  { name: 'Neptune', distance: 4.5e9,    color: '#4a6fa5', radius: 3.5 },
];

// Map spacecraft in permanent orbit or on the surface to their parent body
const SC_PLANET = {
  // Mars orbiters + rovers
  MSL: 'Mars', M20: 'Mars', MRO: 'Mars', M01O: 'Mars', MVN: 'Mars', MEX: 'Mars', TGO: 'Mars',
  // Jupiter orbiter
  JNO: 'Jupiter',
  // Moon orbiters
  LRO: 'Moon', KPLO: 'Moon', CH3: 'Moon',
  // Mercury orbiter
  BEPI: 'Mercury',
  // Solar orbiters
  SOHO: 'Sun', SPP: 'Sun', STA: 'Sun',
};
const PLANET_BY_NAME = {};
PLANET_MARKERS.forEach(p => { PLANET_BY_NAME[p.name] = p; });

let drawnPlanets = []; // { name, x, y, r, spacecraft: [scId, ...] }

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  isMobile = W < 600;
  isShortScreen = H < 500;
  stationPositions = getStationPositions();
  initStarfield();
  document.getElementById('pulse-hint').textContent =
    isMobile ? 'tap a spacecraft to send a light pulse'
             : 'click a spacecraft to send a light pulse';
}
window.addEventListener('resize', resize);
