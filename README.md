# WhisperDSN

Live visualization of NASA's Deep Space Network — watch humanity communicate with its spacecraft across the solar system.

**[whisper.chrisb.cloud](https://whisper.chrisb.cloud)**

## What it shows

Three DSN ground stations (Goldstone, Madrid, Canberra) and every spacecraft they're talking to, plotted by log-scale distance with animated signal pulses between them. Gold = transmitting, blue = receiving, green = two-way. Particle speed scales with distance — Moon signals zip across the screen, Voyager barely drifts.

- **Hover/tap** a spacecraft for distance, light time, data rate, and band
- **Hover** a station for local time, dish status, and recently tracked spacecraft
- **Click** a spacecraft to send a light pulse that travels at proportional speed
- **Spacecraft memory** — targets stay visible for 24 hours after last contact, so the sky fills as the Earth rotates
- **Ambient audio** — optional pentatonic tones tied to active links (toggle in top-right corner)
- **Responsive** — works on mobile with touch support

## Stack

- Single `index.html` — vanilla JS, HTML5 Canvas, Web Audio API. No build step, no framework
- Cloudflare Pages — static hosting
- Cloudflare Worker (`worker/dsn-proxy.js`) — proxies NASA's DSN XML feed as JSON with CORS headers, plus a `/spacecraft` endpoint for name lookups

## Deploy

### Static site (Cloudflare Pages)

Connect this repo to Cloudflare Pages. No build command, output directory is `/`.

### Worker (DSN proxy)

```bash
cd worker
npm install
npx wrangler deploy
```

Update the `WORKER_URL` constant in `index.html` with your worker URL.

### Custom domain

Add a CNAME record: `whisper.chrisb.cloud → <project>.pages.dev`

## Data source

Real-time XML feed from [NASA/JPL DSN Now](https://eyes.nasa.gov/apps/dsn-now/dsn.html), updated every 5 seconds.
