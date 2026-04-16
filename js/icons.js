// ── Spacecraft Icons ────────────────────────────────────────────────
function drawVoyagerIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 0.8;
  // Dish
  ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.35, Math.PI, 0); ctx.stroke();
  // Boom
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.3); ctx.lineTo(x, y + s * 0.5); ctx.stroke();
  // Magnetometer crossbar
  ctx.beginPath(); ctx.moveTo(x - s * 0.25, y + s * 0.3); ctx.lineTo(x + s * 0.25, y + s * 0.3); ctx.stroke();
}

function drawJWSTIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  const r = s * 0.4;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  // Hex outline
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i - Math.PI / 6;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.stroke();
}

function drawRoverIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 0.8;
  // Body
  const bw = s * 0.5, bh = s * 0.25;
  ctx.strokeRect(x - bw, y - bh * 0.3, bw * 2, bh);
  // Wheels
  ctx.beginPath(); ctx.arc(x - bw * 0.6, y + bh * 0.7 + 1, s * 0.15, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + bw * 0.6, y + bh * 0.7 + 1, s * 0.15, 0, Math.PI * 2); ctx.stroke();
  // Mast
  ctx.beginPath(); ctx.moveTo(x + bw * 0.3, y - bh * 0.3); ctx.lineTo(x + bw * 0.3, y - s * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + bw * 0.3, y - s * 0.55, 1, 0, Math.PI * 2); ctx.fill();
}

function drawOrbiterIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  // Dish
  ctx.beginPath(); ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.25, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
  // Body
  ctx.beginPath(); ctx.moveTo(x - s * 0.1, y); ctx.lineTo(x + s * 0.3, y); ctx.stroke();
  // Solar panels
  ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.35); ctx.lineTo(x + s * 0.1, y + s * 0.35); ctx.stroke();
  ctx.strokeRect(x + s * 0.05, y - s * 0.35, s * 0.1, s * 0.2);
  ctx.strokeRect(x + s * 0.05, y + s * 0.15, s * 0.1, s * 0.2);
}

function drawTelescopeIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  // Tube
  ctx.strokeRect(x - s * 0.15, y - s * 0.4, s * 0.3, s * 0.8);
  // Aperture
  ctx.beginPath(); ctx.arc(x, y - s * 0.4, s * 0.15, 0, Math.PI * 2); ctx.stroke();
  // Solar panels
  ctx.beginPath(); ctx.moveTo(x - s * 0.15, y); ctx.lineTo(x - s * 0.45, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + s * 0.15, y); ctx.lineTo(x + s * 0.45, y); ctx.stroke();
}

function drawSolarIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  // Central circle
  ctx.beginPath(); ctx.arc(x, y, s * 0.2, 0, Math.PI * 2); ctx.stroke();
  // Rays
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 * (i * 2 + 1);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28);
    ctx.lineTo(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45);
    ctx.stroke();
  }
}

function drawLunarIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  // Small box body
  ctx.strokeRect(x - s * 0.2, y - s * 0.15, s * 0.4, s * 0.3);
  // Solar panel lines
  ctx.beginPath(); ctx.moveTo(x - s * 0.2, y); ctx.lineTo(x - s * 0.45, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + s * 0.2, y); ctx.lineTo(x + s * 0.45, y); ctx.stroke();
}

function drawNewHorizonsIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  // Triangular body
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.3);
  ctx.lineTo(x - s * 0.25, y + s * 0.3);
  ctx.lineTo(x + s * 0.25, y + s * 0.3);
  ctx.closePath(); ctx.stroke();
  // Dish on top
  ctx.beginPath(); ctx.arc(x, y - s * 0.35, s * 0.18, Math.PI, 0); ctx.stroke();
}

function drawProbeIcon(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  // Small dish
  ctx.beginPath(); ctx.arc(x, y - s * 0.2, s * 0.2, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
  // Body line
  ctx.beginPath(); ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x, y + s * 0.3); ctx.stroke();
  // Fins
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.15); ctx.lineTo(x - s * 0.25, y + s * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.15); ctx.lineTo(x + s * 0.25, y + s * 0.35); ctx.stroke();
}

const SPACECRAFT_ICONS = {
  VGR1: drawVoyagerIcon, VGR2: drawVoyagerIcon,
  JWST: drawJWSTIcon,
  MSL: drawRoverIcon, M20: drawRoverIcon,
  MRO: drawOrbiterIcon, M01O: drawOrbiterIcon, JNO: drawOrbiterIcon,
  MEX: drawOrbiterIcon, MVN: drawOrbiterIcon, EURC: drawOrbiterIcon,
  PSYC: drawOrbiterIcon, LUCY: drawOrbiterIcon, BEPI: drawOrbiterIcon, TGO: drawOrbiterIcon,
  SOHO: drawSolarIcon, SPP: drawSolarIcon, STA: drawSolarIcon, DSCO: drawSolarIcon, IMAP: drawSolarIcon,
  CHDR: drawTelescopeIcon, HST: drawTelescopeIcon, XMM: drawTelescopeIcon,
  TESS: drawTelescopeIcon, GAIA: drawTelescopeIcon,
  LRO: drawLunarIcon, KPLO: drawLunarIcon, CH3: drawLunarIcon,
  NHPC: drawNewHorizonsIcon,
  CGO: drawProbeIcon, WIND: drawProbeIcon, ACE: drawProbeIcon,
};
