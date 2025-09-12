// Simple multi-core wrapper using EmulatorJS (CDN).
// Docs: https://emulatorjs.org/docs/ (options, supported systems, CDN)
const CACHED = {
  core: 'gba',
  file: null,
  url: null,
  running: false,
};

// Base pixel sizes and aspect ratios by console for initial scaling.
const BASE = {
  nes:  { w: 256, h: 240, ar: 240/256 },     // ~4:3 display; use square pixels here
  snes: { w: 256, h: 224, ar: 224/256 },
  n64:  { w: 320, h: 240, ar: 240/320 },
  gba:  { w: 240, h: 160, ar: 160/240 },     // 3:2
  gb:   { w: 160, h: 144, ar: 144/160 },
  gbc:  { w: 160, h: 144, ar: 144/160 },
  nds:  { w: 256, h: 384, ar: 384/256 },     // stacked screens; varies by layout
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

// Keep CSS custom properties in sync for scale presets.
function applyBaseDims(core) {
  const b = BASE[core] || BASE['gba'];
  stage.style.setProperty('--base-w', b.w);
  stage.style.setProperty('--base-h', b.h);
  stage.style.setProperty('--ar', String(b.h / b.w));
  // Default GBA to smaller look (1x); others default to fit
  if (core === 'gba') {
    setScaleClass('orig');
  } else {
    setScaleClass('fit');
  }
}
function setScaleClass(name) {
  stage.classList.remove('orig', 'pp2', 'pp3', 'fit', 'stretch');
  stage.classList.add(name);
}

consoleSel.addEventListener('change', () => {
  CACHED.core = consoleSel.value;
  applyBaseDims(CACHED.core);
});

romInput.addEventListener('change', () => {
  const file = romInput.files?.[0];
  startBtn.disabled = !file;
  CACHED.file = file || null;
});

scaleMode.addEventListener('change', () => {
  setScaleClass(scaleMode.value);
});

startBtn.addEventListener('click', () => {
  if (!CACHED.file) return;
  launch(CACHED.core, CACHED.file);
});

pauseBtn.addEventListener('click', () => {
  // Prefer documented UI: trigger the toolbar's pause if available; else try engine pause event.
  try {
    if (window.EJS_emulator && typeof window.EJS_emulator.togglePause === 'function') {
      window.EJS_emulator.togglePause(true);
    } else if (window.dispatchEvent) {
      // Fallback: blur to pause in many cores
      window.dispatchEvent(new Event('blur'));
    }
  } catch {}
});

resumeBtn.addEventListener('click', () => {
  try {
    if (window.EJS_emulator && typeof window.EJS_emulator.togglePause === 'function') {
      window.EJS_emulator.togglePause(false);
    } else if (document.hasFocus === 'function') {
      window.focus();
    }
  } catch {}
});

volume.addEventListener('input', () => {
  try {
    // Apply immediately if emulator exposed; else it will be used as default on next launch.
    if (typeof window.EJS_setVolume === 'function') {
      window.EJS_setVolume(parseFloat(volume.value));
    } else {
      window.EJS_volume = parseFloat(volume.value); // default for next run
    }
  } catch {}
});

function clearOldEmu() {
  const game = document.getElementById('game');
  game.innerHTML = ''; // drop old canvas/UI
  // Remove any previous loader <script> to allow re-init
  const old = document.querySelector('script[data-ejs-loader]');
  if (old) old.remove();
}

// Launch emulator with selected core and ROM file
function launch(core, file) {
  clearOldEmu();
  // revoke previous blob url
  if (CACHED.url) URL.revokeObjectURL(CACHED.url);
  const blobUrl = URL.createObjectURL(file);
  CACHED.url = blobUrl;

  // Configure EmulatorJS globals BEFORE loading loader.js
  window.EJS_player = '#game';
  window.EJS_core = core;            // nes | snes | n64 | gba | gb | gbc | nds | ...
  window.EJS_gameUrl = blobUrl;      // user-supplied ROM
  window.EJS_gameName = file.name;
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/latest/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_volume = parseFloat(volume.value);
  // Show toolbar and enable save/load buttons (use defaults if undefined)
  window.EJS_screenCapture = {}; // leave capture enabled
  // Example of enabling custom button labels (optional)
  // window.EJS_screenCapture = { photo: { format: "png", upscale: 1 }, video: { fps: 60 } };

  // Hook useful lifecycle callbacks
  window.EJS_ready = () => {
    CACHED.running = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = false;
  };
  window.EJS_onGameStart = () => {
    // Ensure stage class reflects current core
    applyBaseDims(core);
  };

  // Dynamically insert loader
  const s = document.createElement('script');
  s.src = 'https://cdn.emulatorjs.org/latest/data/loader.js';
  s.setAttribute('data-ejs-loader', '1');
  s.defer = true;
  document.body.appendChild(s);
}
applyBaseDims(CACHED.core);
