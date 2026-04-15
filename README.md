# WhisperDSN

Live visualization of NASA's Deep Space Network — watch humanity communicate with its spacecraft across the solar system.

**[whisper.chrisb.cloud](https://whisper.chrisb.cloud)**

## What it shows

Three DSN ground stations (Goldstone, Madrid, Canberra) and every spacecraft they're talking to, with animated signal pulses. Gold = transmitting, blue = receiving, green = two-way. Particle speed scales with distance — Moon signals zip across the screen, Voyager barely drifts.

## Stack

- Single `index.html` — no build step, no framework
- Cloudflare Pages — static hosting
- Cloudflare Worker — proxies NASA's DSN XML feed as JSON with CORS headers

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
