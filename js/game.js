// ── Easter Egg: Asteroids ───────────────────────────────────────────
let gameState = null;
let gameKeys = {};
let gameTouches = {};

// Drifting asteroid hint — lazily floats across the starfield
let easterRock = null;
let easterRockTimer = 0;
const ROCK_INTERVAL = 1800; // frames between appearances (~30s at 60fps)

function initEasterRock() {
  // Enter from a random edge, drift slowly across
  const side = Math.floor(Math.random() * 4);
  let x, y, vx, vy;
  if (side === 0)      { x = -30;    y = Math.random() * H * 0.6; vx = 0.3 + Math.random() * 0.3; vy = (Math.random() - 0.3) * 0.2; }
  else if (side === 1) { x = W + 30; y = Math.random() * H * 0.6; vx = -(0.3 + Math.random() * 0.3); vy = (Math.random() - 0.3) * 0.2; }
  else if (side === 2) { x = Math.random() * W; y = -30;    vx = (Math.random() - 0.5) * 0.3; vy = 0.2 + Math.random() * 0.3; }
  else                 { x = Math.random() * W; y = H * 0.6; vx = (Math.random() - 0.5) * 0.3; vy = -(0.2 + Math.random() * 0.3); }

  const n = 8 + Math.floor(Math.random() * 4);
  const verts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 12 * (0.7 + Math.random() * 0.6);
    verts.push({ a, r });
  }

  easterRock = {
    x, y, vx, vy,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.008,
    verts,
    radius: 12,
  };
}

function updateEasterRock() {
  if (gameState) return;
  if (!easterRock) {
    easterRockTimer++;
    if (easterRockTimer > ROCK_INTERVAL) {
      easterRockTimer = 0;
      initEasterRock();
    }
    return;
  }
  easterRock.x += easterRock.vx;
  easterRock.y += easterRock.vy;
  easterRock.rotation += easterRock.rotSpeed;
  // Remove when off screen
  if (easterRock.x < -60 || easterRock.x > W + 60 || easterRock.y < -60 || easterRock.y > H + 60) {
    easterRock = null;
  }
}

function drawEasterRock() {
  if (!easterRock || gameState) return;
  ctx.save();
  ctx.translate(easterRock.x, easterRock.y);
  ctx.rotate(easterRock.rotation);
  ctx.strokeStyle = 'rgba(74,85,104,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  easterRock.verts.forEach((v, i) => {
    const px = Math.cos(v.a) * v.r;
    const py = Math.sin(v.a) * v.r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function hitTestEasterRock(x, y) {
  if (!easterRock || gameState) return false;
  const dx = x - easterRock.x, dy = y - easterRock.y;
  return dx * dx + dy * dy < (easterRock.radius + 10) * (easterRock.radius + 10);
}

// Konami code detection (desktop)
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiBuffer = [];
document.addEventListener('keydown', e => {
  if (gameState) return;
  konamiBuffer.push(e.key);
  if (konamiBuffer.length > 10) konamiBuffer.shift();
  if (konamiBuffer.length === 10 && konamiBuffer.every((k, i) => k === KONAMI[i])) {
    konamiBuffer = [];
    activateGame();
  }
});

// Mobile konami: swipe up/up/down/down/left/right/left/right then tap tap
const KONAMI_MOBILE = ['up','up','down','down','left','right','left','right','tap','tap'];
let mobileKonamiBuffer = [];
let swipeStartX = 0, swipeStartY = 0;

canvas.addEventListener('touchstart', e => {
  if (gameState) return;
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
  if (gameState) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - swipeStartX;
  const dy = touch.clientY - swipeStartY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let gesture;
  if (dist < 20) {
    gesture = 'tap';
  } else if (Math.abs(dx) > Math.abs(dy)) {
    gesture = dx > 0 ? 'right' : 'left';
  } else {
    gesture = dy > 0 ? 'down' : 'up';
  }

  mobileKonamiBuffer.push(gesture);
  if (mobileKonamiBuffer.length > 10) mobileKonamiBuffer.shift();
  if (mobileKonamiBuffer.length === 10 && mobileKonamiBuffer.every((g, i) => g === KONAMI_MOBILE[i])) {
    mobileKonamiBuffer = [];
    activateGame();
  }
}, { passive: true });

function activateGame() {
  document.body.classList.add('game-active');
  tooltip.classList.remove('visible');
  activeTooltipConn = null;
  easterRock = null;

  const hs = parseInt(localStorage.getItem('whisperdsn_highscore') || '0', 10);

  gameState = {
    ship: { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0, thrust: false },
    asteroids: [],
    bullets: [],
    explosions: [],
    score: 0,
    lives: 3,
    wave: 0,
    invulnerable: 0,
    gameOver: false,
    highScore: hs,
    introTimer: 60,
    lastFireTime: 0,
  };
  spawnWave();
}

function deactivateGame() {
  gameState = null;
  gameKeys = {};
  gameTouches = {};
  document.body.classList.remove('game-active');
}

function spawnWave() {
  const gs = gameState;
  gs.wave++;
  const count = 2 + gs.wave * 2;
  for (let i = 0; i < count; i++) {
    let x, y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -20 : W + 20;
      y = Math.random() * H;
    } else {
      x = Math.random() * W;
      y = Math.random() < 0.5 ? -20 : H + 20;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * (0.3 + gs.wave * 0.1);
    gs.asteroids.push(makeAsteroid(x, y, angle, speed, 3));
  }
}

function makeAsteroid(x, y, angle, speed, size) {
  const verts = [];
  const n = 8 + Math.floor(Math.random() * 5);
  const baseR = size === 3 ? 30 : size === 2 ? 18 : 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = baseR * (0.7 + Math.random() * 0.6);
    verts.push({ a, r });
  }
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size, radius: baseR,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    verts,
  };
}

function wrapPos(obj) {
  if (obj.x < -40) obj.x += W + 80;
  if (obj.x > W + 40) obj.x -= W + 80;
  if (obj.y < -40) obj.y += H + 80;
  if (obj.y > H + 40) obj.y -= H + 80;
}

function updateGame(t) {
  const gs = gameState;
  if (gs.introTimer > 0) { gs.introTimer--; return; }
  if (gs.gameOver) return;

  const ship = gs.ship;
  const left = gameKeys['ArrowLeft'] || gameKeys['a'] || gameTouches.left;
  const right = gameKeys['ArrowRight'] || gameKeys['d'] || gameTouches.right;
  const thrustOn = gameKeys['ArrowUp'] || gameKeys['w'] || gameTouches.thrust;
  const firing = gameKeys[' '] || gameTouches.fire;

  if (left) ship.angle -= 0.05;
  if (right) ship.angle += 0.05;

  ship.thrust = thrustOn;
  if (thrustOn) {
    ship.vx += Math.cos(ship.angle) * 0.12;
    ship.vy += Math.sin(ship.angle) * 0.12;
  }

  ship.vx *= 0.995;
  ship.vy *= 0.995;
  const maxSpeed = 6;
  const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  if (spd > maxSpeed) { ship.vx *= maxSpeed / spd; ship.vy *= maxSpeed / spd; }

  ship.x += ship.vx;
  ship.y += ship.vy;
  wrapPos(ship);

  if (firing && t - gs.lastFireTime > 200) {
    gs.lastFireTime = t;
    gs.bullets.push({
      x: ship.x + Math.cos(ship.angle) * 14,
      y: ship.y + Math.sin(ship.angle) * 14,
      vx: Math.cos(ship.angle) * 5 + ship.vx * 0.3,
      vy: Math.sin(ship.angle) * 5 + ship.vy * 0.3,
      life: 70,
    });
  }

  gs.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; wrapPos(b); });
  gs.bullets = gs.bullets.filter(b => b.life > 0);

  gs.asteroids.forEach(a => { a.x += a.vx; a.y += a.vy; a.rotation += a.rotSpeed; wrapPos(a); });

  // Bullet-asteroid collisions
  const newAsteroids = [];
  gs.asteroids = gs.asteroids.filter(a => {
    for (let i = gs.bullets.length - 1; i >= 0; i--) {
      const b = gs.bullets[i];
      const dx = a.x - b.x, dy = a.y - b.y;
      if (dx * dx + dy * dy < a.radius * a.radius) {
        gs.bullets.splice(i, 1);
        gs.score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100;
        for (let j = 0; j < 6; j++) {
          const ea = Math.random() * Math.PI * 2;
          gs.explosions.push({
            x: a.x, y: a.y,
            vx: Math.cos(ea) * (1 + Math.random() * 2),
            vy: Math.sin(ea) * (1 + Math.random() * 2),
            life: 20 + Math.random() * 15,
          });
        }
        if (a.size > 1) {
          for (let j = 0; j < 2; j++) {
            const na = Math.random() * Math.PI * 2;
            const ns = Math.sqrt(a.vx * a.vx + a.vy * a.vy) * 1.2 + 0.3;
            newAsteroids.push(makeAsteroid(a.x, a.y, na, ns, a.size - 1));
          }
        }
        return false;
      }
    }
    return true;
  });
  gs.asteroids.push(...newAsteroids);

  // Ship-asteroid collision
  if (gs.invulnerable > 0) {
    gs.invulnerable--;
  } else {
    for (const a of gs.asteroids) {
      const dx = ship.x - a.x, dy = ship.y - a.y;
      if (dx * dx + dy * dy < (a.radius + 8) * (a.radius + 8)) {
        gs.lives--;
        for (let j = 0; j < 10; j++) {
          const ea = Math.random() * Math.PI * 2;
          gs.explosions.push({
            x: ship.x, y: ship.y,
            vx: Math.cos(ea) * (1 + Math.random() * 3),
            vy: Math.sin(ea) * (1 + Math.random() * 3),
            life: 25 + Math.random() * 20,
          });
        }
        if (gs.lives <= 0) {
          gs.gameOver = true;
          if (gs.score > gs.highScore) {
            gs.highScore = gs.score;
            localStorage.setItem('whisperdsn_highscore', gs.score.toString());
          }
          return;
        }
        ship.x = W / 2; ship.y = H / 2;
        ship.vx = 0; ship.vy = 0;
        gs.invulnerable = 120;
        break;
      }
    }
  }

  gs.explosions.forEach(e => { e.x += e.vx; e.y += e.vy; e.vx *= 0.96; e.vy *= 0.96; e.life--; });
  gs.explosions = gs.explosions.filter(e => e.life > 0);

  if (gs.asteroids.length === 0) spawnWave();
}

function drawGame(t) {
  const gs = gameState;

  // Intro text
  if (gs.introTimer > 0) {
    const alpha = Math.min(gs.introTimer / 20, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(212,162,106,${alpha})`;
    ctx.font = '14px "JetBrains Mono"';
    ctx.fillText('INCOMING SIGNAL DETECTED', W / 2, H / 2 - 20);
    ctx.font = '28px "DM Serif Display"';
    ctx.fillText('ASTEROIDS', W / 2, H / 2 + 20);
    return;
  }

  const ship = gs.ship;

  // Ship
  if (!gs.gameOver) {
    const visible = gs.invulnerable <= 0 || Math.floor(gs.invulnerable / 4) % 2 === 0;
    if (visible) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = '#d4a26a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.quadraticCurveTo(14, 0, -10, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7, 0, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d4a26a';
      ctx.fill();
      if (ship.thrust) {
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(-16 - Math.random() * 6, 0);
        ctx.lineTo(-10, 4);
        ctx.fillStyle = `rgba(91,143,185,${0.4 + Math.random() * 0.4})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Asteroids
  gs.asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.beginPath();
    a.verts.forEach((v, i) => {
      const px = Math.cos(v.a) * v.r;
      const py = Math.sin(v.a) * v.r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });

  // Bullets
  gs.bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,162,106,0.8)';
    ctx.fill();
  });

  // Explosions
  gs.explosions.forEach(e => {
    const alpha = e.life / 35;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212,162,106,${alpha})`;
    ctx.fill();
  });

  // HUD — score
  ctx.textAlign = 'right';
  ctx.font = '16px "JetBrains Mono"';
  ctx.fillStyle = '#d4a26a';
  ctx.fillText(gs.score.toString(), W - 24, 40);

  // HUD — lives
  ctx.textAlign = 'left';
  for (let i = 0; i < gs.lives; i++) {
    const lx = 24 + i * 24, ly = H - 30;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = '#d4a26a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.quadraticCurveTo(8, 0, -6, 5);
    ctx.stroke();
    ctx.restore();
  }

  // HUD — wave
  ctx.textAlign = 'center';
  ctx.font = '10px "JetBrains Mono"';
  ctx.fillStyle = 'rgba(74,85,104,0.6)';
  ctx.fillText('WAVE ' + gs.wave, W / 2, 36);

  // Exit hint
  ctx.font = '9px "JetBrains Mono"';
  ctx.fillStyle = 'rgba(74,85,104,0.4)';
  ctx.fillText(isMobile ? 'TAP \u2715 TO EXIT' : 'ESC TO EXIT', W / 2, H - 20);

  // Mobile exit button
  if (isMobile) {
    ctx.textAlign = 'center';
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(74,85,104,0.5)';
    ctx.fillText('\u2715', W - 30, 38);

    // Touch control buttons
    if (!gs.gameOver) {
      const btns = gameBtnPositions();
      const s = GAME_BTN_SIZE;
      const r = 8;
      [
        { pos: btns.thrust, label: '\u25b2', active: gameTouches.thrust },
        { pos: btns.fire,   label: '\u25cf', active: gameTouches.fire },
      ].forEach(({ pos, label, active }) => {
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, s, s, r);
        ctx.fillStyle = active ? 'rgba(212,162,106,0.15)' : 'rgba(74,85,104,0.1)';
        ctx.fill();
        ctx.strokeStyle = active ? 'rgba(212,162,106,0.4)' : 'rgba(74,85,104,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = active ? 'rgba(212,162,106,0.7)' : 'rgba(74,85,104,0.5)';
        ctx.font = '18px "JetBrains Mono"';
        ctx.fillText(label, pos.x + s / 2, pos.y + s / 2 + 6);
      });
    }
  }

  // Game over
  if (gs.gameOver) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5,7,10,0.6)';
    ctx.fillRect(0, H * 0.3, W, H * 0.4);
    ctx.font = '32px "DM Serif Display"';
    ctx.fillStyle = '#d4a26a';
    ctx.fillText('SIGNAL LOST', W / 2, H / 2 - 30);
    ctx.font = '14px "JetBrains Mono"';
    ctx.fillStyle = '#c8d6e5';
    ctx.fillText('SCORE  ' + gs.score, W / 2, H / 2 + 10);
    if (gs.highScore > 0) {
      ctx.font = '11px "JetBrains Mono"';
      ctx.fillStyle = '#4a5568';
      ctx.fillText('BEST  ' + gs.highScore, W / 2, H / 2 + 32);
    }
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillStyle = 'rgba(212,162,106,0.6)';
    ctx.fillText(isMobile ? 'TAP TO RETRY' : 'SPACE TO RETRY  \u00b7  ESC TO EXIT', W / 2, H / 2 + 60);
  }
}

// Game keyboard input
document.addEventListener('keydown', e => {
  if (!gameState) return;
  gameKeys[e.key] = true;
  if (e.key === 'Escape') { deactivateGame(); e.preventDefault(); return; }
  if (gameState.gameOver && e.key === ' ') {
    const hs = gameState.highScore;
    activateGame();
    gameState.highScore = hs;
    gameState.introTimer = 0;
    e.preventDefault();
    return;
  }
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { gameKeys[e.key] = false; });

// Game touch input — dual-zone rotation + thrust/fire buttons
const GAME_BTN_SIZE = 44;
const GAME_BTN_GAP = 14;

function gameBtnPositions() {
  return {
    thrust: { x: W - GAME_BTN_SIZE * 2 - GAME_BTN_GAP - 20, y: H - GAME_BTN_SIZE - 20 },
    fire:   { x: W - GAME_BTN_SIZE - 20, y: H - GAME_BTN_SIZE - 20 },
  };
}

function hitGameBtn(x, y) {
  const btns = gameBtnPositions();
  for (const [name, btn] of Object.entries(btns)) {
    if (x >= btn.x && x <= btn.x + GAME_BTN_SIZE && y >= btn.y && y <= btn.y + GAME_BTN_SIZE) return name;
  }
  return null;
}

canvas.addEventListener('touchstart', e => {
  if (!gameState) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const x = touch.clientX, y = touch.clientY;
    if (isMobile && x > W - 60 && y < 60) { deactivateGame(); return; }
    if (gameState.gameOver) {
      const hs = gameState.highScore;
      activateGame();
      gameState.highScore = hs;
      gameState.introTimer = 0;
      return;
    }
    const btn = hitGameBtn(x, y);
    if (btn === 'thrust') gameTouches.thrust = true;
    else if (btn === 'fire') gameTouches.fire = true;
    else if (x < W / 2) gameTouches.left = true;
    else gameTouches.right = true;
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  if (!gameState) return;
  e.preventDefault();
  gameTouches = {};
  for (const touch of e.touches) {
    const x = touch.clientX, y = touch.clientY;
    const btn = hitGameBtn(x, y);
    if (btn === 'thrust') gameTouches.thrust = true;
    else if (btn === 'fire') gameTouches.fire = true;
    else if (x < W / 2) gameTouches.left = true;
    else gameTouches.right = true;
  }
}, { passive: false });
