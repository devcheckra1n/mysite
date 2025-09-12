// Multi-core wrapper using EmulatorJS (CDN) with hard-reset between launches.

const CACHED = {
  core: 'gba',
  file: null,
  url: null,
  running: false,
};

const BASE = {
  nes:  { w: 256, h: 240, ar: 240/256 },
  snes: { w: 256, h: 224, ar: 224/256 },
  n64:  { w: 320, h: 240, ar: 240/320 },
  gba:  { w: 240, h: 160, ar: 160/240 }, // 3:2
  gb:   { w: 160, h: 144, ar: 144/160 },
  gbc:  { w: 160, h: 144, ar: 144/160 },
  nds:  { w: 256, h: 384, ar: 384/256 },
};

const $ = (sel) => document.querySelector(sel);
const stage = $('#stage');
const romInput = $('#romFile');
const startBtn = $('#startBtn');
const consoleSel = $('#consoleSelect');
const volume = $('#volume');
const pauseBtn = $('#pauseBtn');
const resumeBtn = $('#resumeBtn');
const scaleMode = $('#scaleMode');

let currentLoaderScript = null;

function setScaleClass(name) {
  stage.classList.remove('orig', 'pp2', 'pp3', 'fit', 'stretch');
  stage.classList.add(name);
}

function applyBaseDims(core) {
  const b = BASE[core] || BASE['gba'];
  stage.style.setProperty('--base-w', b.w);
  stage.style.setProperty('--base-h', b.h);
  stage.style.setProperty('--ar', String(b.h / b.w));

  // Default: GBA looks best at 3x pixel-perfect; others default to Fit.
  if (core === 'gba') {
    scaleMode.value = 'pp3';
    setScaleClass('pp3');
  } else {
    scaleMode.value = 'fit';
    setScaleClass('fit');
  }
}

// ---- HARD RESET: fully tear down the previous emulator instance ----
function resetEmu({ revokeRom = true } = {}) {
  try { window.EJS_emulator?.togglePause?.(true); } catch {}
  try { window.EJS_emulator?.stop?.(); } catch {}
  try { window.EJS_emulator?.quit?.(); } catch {}
  try { window.EJS_audioContext?.close?.(); } catch {}
  try { window.Module?.SDL2?.audioContext?.close?.(); } catch {}

  // Remove the rendered canvas/toolbar
  const game = document.getElementById('game');
  game.innerHTML = '';

  // Remove the previously injected loader script
  if (currentLoaderScript) {
    currentLoaderScript.remove();
    currentLoaderScript = null;
  }

  // Nuke EJS globals to avoid reusing stale state
  [
    'EJS_emulator','EJS_player','EJS_core','EJS_gameUrl','EJS_gameName',
    'EJS_ready','EJS_onGameStart','EJS_volume','EJS_pathtodata',
    'EJS_startOnLoaded','EJS_screenCapture'
  ].forEach((k) => { try { delete window[k]; } catch {} });

  // Revoke last ROM blob URL
  if (revokeRom && CACHED.url) {
    try { URL.revokeObjectURL(CACHED.url); } catch {}
    CACHED.url = null;
  }

  CACHED.running = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
}

// ---- UI events ----
consoleSel.addEventListener('change', () => {
  CACHED.core = consoleSel.value;
  applyBaseDims(CACHED.core);

  // Full reset and wait for a new ROM
  resetEmu({ revokeRom: true });
  CACHED.file = null;
  romInput.value = '';
  startBtn.disabled = true;
});

romInput.addEventListener('change', () => {
  const file = romInput.files?.[0] || null;
  CACHED.file = file;
  startBtn.disabled = !file;
});

scaleMode.addEventListener('change', () => {
  setScaleClass(scaleMode.value);
});

startBtn.addEventListener('click', () => {
  if (!CACHED.file) return;
  launch(CACHED.core, CACHED.file);
});

pauseBtn.addEventListener('click', () => {
  try {
    if (window.EJS_emulator?.togglePause) window.EJS_emulator.togglePause(true);
    else window.dispatchEvent(new Event('blur'));
  } catch {}
});

resumeBtn.addEventListener('click', () => {
  try {
    if (window.EJS_emulator?.togglePause) window.EJS_emulator.togglePause(false);
    else window.focus();
  } catch {}
});

volume.addEventListener('input', () => {
  const v = parseFloat(volume.value);
  try {
    if (typeof window.EJS_setVolume === 'function') window.EJS_setVolume(v);
    else window.EJS_volume = v;
  } catch {}
});

// ---- Launch a core with the selected ROM ----
function launch(core, file) {
  // Make sure any previous instance is fully gone
  resetEmu({ revokeRom: false });

  // Create a fresh blob URL for the selected file
  if (CACHED.url) { try { URL.revokeObjectURL(CACHED.url); } catch {} }
  CACHED.url = URL.createObjectURL(file);

  window.EJS_player = '#game';
  window.EJS_core = core;               // nes | snes | n64 | gba | gb | gbc | nds | ...
  window.EJS_gameUrl = CACHED.url;      // user-provided ROM
  window.EJS_gameName = file.name;
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/latest/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_volume = parseFloat(volume.value);
  window.EJS_screenCapture = {};

  window.EJS_ready = () => {
    CACHED.running = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = false;
  };

  window.EJS_onGameStart = () => {
    applyBaseDims(core);
  };

  // Inject a new loader script (fresh instance)
  const s = document.createElement('script');
  s.src = 'https://cdn.emulatorjs.org/latest/data/loader.js';
  s.defer = true;
  s.setAttribute('data-ejs-loader', '1');
  currentLoaderScript = s;
  document.body.appendChild(s);
}

// Initial UI baseline
applyBaseDims(CACHED.core);
setScaleClass('pp3'); // default GBA 3×
startBtn.disabled = true;
pauseBtn.disabled = true;
resumeBtn.disabled = true;