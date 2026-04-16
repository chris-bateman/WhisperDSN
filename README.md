# WhisperDSN

Live visualization of NASA's Deep Space Network — watch humanity communicate with its spacecraft across the solar system.

**[whisper.chrisb.cloud](https://whisper.chrisb.cloud)**

## What it shows

Three DSN ground stations (Goldstone, Madrid, Canberra) and every spacecraft they're talking to, plotted by log-scale distance with animated signal pulses. Gold = transmitting, blue = receiving, green = two-way. Particle speed scales with distance — Moon signals zip across the screen, Voyager barely drifts.

### Features

- **Spacecraft icons** — recognizable silhouettes for ~30 known missions (Voyager's dish, JWST's hexagon, rovers, orbiters, telescopes)
- **Signal waveforms** — animated sine waves along active connections, varying by band (S/X/Ka) and data rate
- **Distance markers** — planet distance reference lines across the sky with the Sun and Heliopause
- **Planet anchors** — Mars, Jupiter, Moon, Mercury, and Sun markers appear near their orbiting spacecraft
- **Live stats** — total downlink data rate (MB/s) and uplink transmitter power (kW)
- **Hover/tap** a spacecraft for distance, light time, data rate, and band
- **Hover** a station for local time, dish status, and recently tracked spacecraft
- **Click** a spacecraft to send a light pulse that travels at proportional speed
- **Spacecraft memory** — targets stay visible for 24 hours after last contact, so the sky fills as the Earth rotates
- **Ambient audio** — optional pentatonic tones tied to active links (toggle in top-right corner)
- **Hidden Asteroids game** — Konami code on desktop, swipe pattern on mobile, or click the drifting asteroid
- **Responsive** — works on mobile with touch support

## Stack

- Vanilla JS, HTML5 Canvas, Web Audio API — no build step, no framework
- Cloudflare Pages — static hosting
- Cloudflare Worker (`worker/dsn-proxy.js`) — proxies NASA's DSN XML feed as JSON with CORS headers, plus a `/spacecraft` endpoint for name lookups

### Project structure

```
index.html              # HTML shell
css/style.css           # Styles
js/
  state.js              # Global state, constants, planet data
  format.js             # Distance/time formatting, dish colors
  icons.js              # Spacecraft silhouette icon drawing
  rendering.js          # Starfield, distance markers, planet markers
  layout.js             # Station positions, spacecraft layout algorithm
  parsers.js            # DSN XML/JSON parsers
  particles.js          # Signal particle system
  audio.js              # Web Audio ambient synthesis
  game.js               # Hidden Asteroids easter egg
  interaction.js        # Mouse/touch, tooltips, light pulses
  draw.js               # Main render loop
  data.js               # Data fetching, localStorage cache
  init.js               # Boot sequence
worker/
  dsn-proxy.js          # Cloudflare Worker
  wrangler.toml         # Worker config
```

## Deploy

### Static site (Cloudflare Pages)

Connect this repo to Cloudflare Pages. No build command, output directory is `/`.

### Worker (DSN proxy)

```bash
cd worker
npx wrangler deploy
```

Update the `WORKER_URL` constant in `js/state.js` with your worker URL.

### Custom domain

Add a CNAME record: `whisper.chrisb.cloud → <project>.pages.dev`

## Data source

Real-time XML feed from [NASA/JPL DSN Now](https://eyes.nasa.gov/apps/dsn-now/dsn.html), updated every 5 seconds.
