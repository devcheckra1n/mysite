// Clean multi-core wrapper using EmulatorJS (CDN), sandboxed per-run in an iframe.
// - Switching console => full reset (blank screen, no audio).
// - GBA defaults to Pixel-Perfect 3x.

const CACHED = {
  core: 'gba',
  file: null,
  url: null
};

const BASE = {
  nes:  { w: 256, h: 240, ar: 240/256 },
  snes: { w: 256, h: 224, ar: 224/256 },
  n64:  { w: 320, h: 240, ar: 240/320 },
  gba:  { w: 240, h: 160, ar: 160/240 }, // 3:2
  gb:   { w: 160, h: 144, ar: 144/160 },
  gbc:  { w: 160, h: 144, ar: 144/160 },
  nds:  { w: 256, h: 384, ar: 384/256 }
};

const $ = (s)=>document.querySelector(s);
const stage = $('#stage');
const romInput = $('#romFile');
const startBtn = $('#startBtn');
const consoleSel = $('#consoleSelect');
const volume = $('#volume');
const pauseBtn = $('#pauseBtn');
const resumeBtn = $('#resumeBtn');
const scaleMode = $('#scaleMode');

let emuFrame = null;

function setScaleClass(name) {
  stage.classList.remove('orig','pp2','pp3','fit','stretch');
  stage.classList.add(name);
}
function applyBaseDims(core) {
  const b = BASE[core] || BASE.gba;
  stage.style.setProperty('--base-w', b.w);
  stage.style.setProperty('--base-h', b.h);
  stage.style.setProperty('--ar', String(b.h / b.w));

  if (core === 'gba') {       // default GBA at 3× pixel-perfect
    scaleMode.value = 'pp3';
    setScaleClass('pp3');
  } else {
    scaleMode.value = 'fit';
    setScaleClass('fit');
  }
}

// Hard reset: remove iframe (kills audio/loops) and clear blob.
function resetEmu() {
  if (emuFrame) {
    emuFrame.remove();
    emuFrame = null;
  }
  if (CACHED.url) {
    try { URL.revokeObjectURL(CACHED.url); } catch {}
    CACHED.url = null;
  }
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  $('#game').innerHTML = ''; // blank
}

consoleSel.addEventListener('change', () => {
  CACHED.core = consoleSel.value;
  applyBaseDims(CACHED.core);
  resetEmu();               // blank and wait for new ROM
  CACHED.file = null;
  romInput.value = '';
  startBtn.disabled = true;
});

romInput.addEventListener('change', () => {
  CACHED.file = romInput.files?.[0] || null;
  startBtn.disabled = !CACHED.file;
});

scaleMode.addEventListener('change', () => setScaleClass(scaleMode.value));

pauseBtn.addEventListener('click', () => {
  const w = emuFrame?.contentWindow;
  try { w?.EJS_emulator?.togglePause?.(true); } catch {}
});
resumeBtn.addEventListener('click', () => {
  const w = emuFrame?.contentWindow;
  try { w?.EJS_emulator?.togglePause?.(false); } catch {}
});

volume.addEventListener('input', () => {
  const w = emuFrame?.contentWindow;
  const v = parseFloat(volume.value);
  try {
    if (typeof w?.EJS_setVolume === 'function') w.EJS_setVolume(v);
  } catch {}
});

startBtn.addEventListener('click', () => {
  if (!CACHED.file) return;
  launch(CACHED.core, CACHED.file);
});

function launch(core, file) {
  resetEmu();

  // Make ROM URL
  CACHED.url = URL.createObjectURL(file);

  // Create a same-origin sandboxed iframe; removing it kills all audio/loops.
  emuFrame = document.createElement('iframe');
  emuFrame.className = 'emu-frame';
  emuFrame.style.width = '100%';
  emuFrame.style.height = '100%';
  emuFrame.style.border = '0';
  emuFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock');
  $('#game').appendChild(emuFrame);

  const cfg = {
    core,
    name: file.name,
    url: CACHED.url,
    vol: parseFloat(volume.value)
  };

  const doc = emuFrame.contentDocument;
  doc.open();
  doc.write(`<!doctype html>
<html><head><meta charset="utf-8">
<style>html,body{height:100%;margin:0;background:#000}#game{width:100%;height:100%}</style>
</head><body>
<div id="game"></div>
<script>
  // EmulatorJS config lives INSIDE the iframe.
  window.EJS_player = '#game';
  window.EJS_core = ${JSON.stringify(cfg.core)};
  window.EJS_gameUrl = ${JSON.stringify(cfg.url)};
  window.EJS_gameName = ${JSON.stringify(cfg.name)};
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/latest/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_volume = ${cfg.vol};
  window.EJS_ready = function(){ parent.postMessage({type:'EJS_READY'}, '*'); };
  window.EJS_onGameStart = function(){ parent.postMessage({type:'EJS_START'}, '*'); };
<\/script>
<script src="https://cdn.emulatorjs.org/latest/data/loader.js" defer></script>
</body></html>`);
  doc.close();
}

window.addEventListener('message', (e) => {
  if (!e?.data || typeof e.data.type !== 'string') return;
  if (e.data.type === 'EJS_READY') {
    pauseBtn.disabled = false;
    resumeBtn.disabled = false;
  }
  if (e.data.type === 'EJS_START') {
    applyBaseDims(CACHED.core);
  }
});

// Initial UI
applyBaseDims(CACHED.core);
setScaleClass('pp3'); // GBA default 3×
startBtn.disabled = true;
pauseBtn.disabled = true;
resumeBtn.disabled = true;