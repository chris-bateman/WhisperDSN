// ── Audio ────────────────────────────────────────────────────────────
// Ambient pad — each active signal gets a soft, detuned tone
// quantized to a pentatonic scale. Distance maps to pitch.
let audioCtx = null;
let audioEnabled = false;
let voices = {};
let masterGain = null;
let reverbNode = null;

// Pentatonic scale notes (C2-C5 range, always harmonious)
const PENTATONIC = [
  65.41, 73.42, 87.31, 98.00, 110.00,     // C2 D2 F2 G2 A2
  130.81, 146.83, 174.61, 196.00, 220.00,  // C3 D3 F3 G3 A3
  261.63, 293.66, 349.23, 392.00, 440.00,  // C4 D4 F4 G4 A4
];

function nearestNote(freq) {
  let closest = PENTATONIC[0];
  let minDiff = Math.abs(freq - closest);
  for (let i = 1; i < PENTATONIC.length; i++) {
    const diff = Math.abs(freq - PENTATONIC[i]);
    if (diff < minDiff) { minDiff = diff; closest = PENTATONIC[i]; }
  }
  return closest;
}

// Simple reverb using feedback delay
function createReverb(ctx) {
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.4;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  const wet = ctx.createGain();
  wet.gain.value = 0.4;

  delay.connect(filter);
  filter.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  return { input: delay, output: wet };
}

const audioToggle = document.getElementById('audio-toggle');

function toggleAudio() {
  audioEnabled = !audioEnabled;
  audioToggle.classList.toggle('active', audioEnabled);
  if (audioEnabled) {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.6;
      reverbNode = createReverb(audioCtx);
      masterGain.connect(audioCtx.destination);
      masterGain.connect(reverbNode.input);
      reverbNode.output.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    updateAudio();
  } else {
    stopAllAudio();
  }
}

audioToggle.addEventListener('click', toggleAudio);
audioToggle.addEventListener('touchend', e => {
  e.preventDefault();
  toggleAudio();
});

function createVoice(freq) {
  const t = audioCtx.currentTime;

  // Two detuned oscillators for warmth
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 1.003; // slight detune

  // Low-pass filter for softness
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq * 2.5;
  filter.Q.value = 0.5;

  // Slow LFO for gentle breathing
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.1 + Math.random() * 0.15; // 0.1-0.25 Hz
  lfoGain.gain.value = 0.004;
  lfo.connect(lfoGain);

  const gain = audioCtx.createGain();
  gain.gain.value = 0;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  lfoGain.connect(gain.gain);
  gain.connect(masterGain);

  osc1.start(t);
  osc2.start(t);
  lfo.start(t);

  // Fade in slowly
  gain.gain.setTargetAtTime(0.012, t, 1.5);

  return { osc1, osc2, lfo, lfoGain, filter, gain };
}

function updateAudio() {
  if (!audioEnabled || !audioCtx) return;
  const t = audioCtx.currentTime;

  const activeKeys = new Set();
  connections.forEach(c => {
    if (!c.hasActiveUp && !c.hasActiveDown) return;
    const key = c.scId + ':' + c.dish;
    activeKeys.add(key);

    // Map distance to frequency, quantize to pentatonic
    const logRange = Math.log10(Math.max(c.range, 1000));
    const rawFreq = 400 - (logRange / MAX_LOG_RANGE) * 340;
    const freq = nearestNote(Math.max(rawFreq, 60));

    if (!voices[key]) {
      voices[key] = createVoice(freq);
    } else {
      // Gently shift pitch if distance changed
      voices[key].osc1.frequency.setTargetAtTime(freq, t, 2.0);
      voices[key].osc2.frequency.setTargetAtTime(freq * 1.003, t, 2.0);
      voices[key].filter.frequency.setTargetAtTime(freq * 2.5, t, 2.0);
    }
  });

  // Fade out removed connections
  Object.keys(voices).forEach(key => {
    if (!activeKeys.has(key)) {
      const v = voices[key];
      v.gain.gain.setTargetAtTime(0, t, 1.0);
      setTimeout(() => {
        v.osc1.stop(); v.osc2.stop(); v.lfo.stop();
        v.osc1.disconnect(); v.osc2.disconnect();
        v.lfo.disconnect(); v.lfoGain.disconnect();
        v.filter.disconnect(); v.gain.disconnect();
      }, 4000);
      delete voices[key];
    }
  });
}

function stopAllAudio() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  Object.values(voices).forEach(v => {
    v.gain.gain.setTargetAtTime(0, t, 0.5);
    setTimeout(() => {
      v.osc1.stop(); v.osc2.stop(); v.lfo.stop();
      v.osc1.disconnect(); v.osc2.disconnect();
      v.lfo.disconnect(); v.lfoGain.disconnect();
      v.filter.disconnect(); v.gain.disconnect();
    }, 2000);
  });
  voices = {};
}
