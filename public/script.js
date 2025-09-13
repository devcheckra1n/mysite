// EmulatorJS multi-core wrapper with library support and iframe sandbox resets.
// - Click in Library to launch hosted ROMs from /public/roms
// - File picker still works for ad-hoc local ROMs
// - GBA defaults to Pixel-Perfect 3x

const CACHED = { core: 'gba', file: null, url: null };
const BASE = {
  nes:  { w: 256, h: 240, ar: 240/256 },
  snes: { w: 256, h: 224, ar: 224/256 },
  n64:  { w: 320, h: 240, ar: 240/320 },
  gba:  { w: 240, h: 160, ar: 160/240 },
  gb:   { w: 160, h: 144, ar: 144/160 },
  gbc:  { w: 160, h: 144, ar: 144/160 },
  nds:  { w: 256, h: 384, ar: 384/256 }
};

const $  = s => document.querySelector(s);
const stage = $('#stage');
const romInput = $('#romFile');
const startBtn = $('#startBtn');
const consoleSel = $('#consoleSelect');
const volume = $('#volume');
const pauseBtn = $('#pauseBtn');
const resumeBtn = $('#resumeBtn');
const scaleMode = $('#scaleMode');
const searchBox = $('#searchBox');
const gameList = $('#gameList');

let emuFrame = null;
let LIB = [];

function setScaleClass(name) {
  stage.classList.remove('orig','pp2','pp3','fit','stretch');
  stage.classList.add(name);
}
function applyBaseDims(core) {
  const b = BASE[core] || BASE.gba;
  stage.style.setProperty('--base-w', b.w);
  stage.style.setProperty('--base-h', b.h);
  stage.style.setProperty('--ar', String(b.h / b.w));
  if (core === 'gba') { scaleMode.value='pp3'; setScaleClass('pp3'); }
  else { scaleMode.value='fit'; setScaleClass('fit'); }
}
function resetEmu() {
  if (emuFrame) { emuFrame.remove(); emuFrame = null; }
  if (CACHED.url) { try { URL.revokeObjectURL(CACHED.url); } catch{} CACHED.url = null; }
  pauseBtn.disabled = true; resumeBtn.disabled = true;
  $('#game').innerHTML = '';
}

consoleSel.addEventListener('change', () => {
  CACHED.core = consoleSel.value;
  applyBaseDims(CACHED.core);
  resetEmu();
  CACHED.file = null;
  romInput.value = '';
  startBtn.disabled = true;
  renderLibrary();
});
romInput.addEventListener('change', () => {
  CACHED.file = romInput.files?.[0] || null;
  startBtn.disabled = !CACHED.file;
});
scaleMode.addEventListener('change', () => setScaleClass(scaleMode.value));
pauseBtn.addEventListener('click', () => { const w=emuFrame?.contentWindow; try{ w?.EJS_emulator?.togglePause?.(true);}catch{} });
resumeBtn.addEventListener('click', () => { const w=emuFrame?.contentWindow; try{ w?.EJS_emulator?.togglePause?.(false);}catch{} });
volume.addEventListener('input', () => { const w=emuFrame?.contentWindow; const v=parseFloat(volume.value); try{ if (typeof w?.EJS_setVolume==='function') w.EJS_setVolume(v);}catch{} });
startBtn.addEventListener('click', () => { if (CACHED.file) launchLocal(CACHED.core, CACHED.file); });
searchBox?.addEventListener('input', renderLibrary);

function launchLocal(core, file) {
  resetEmu();
  CACHED.url && URL.revokeObjectURL(CACHED.url);
  CACHED.url = URL.createObjectURL(file);
  spawnIframe(core, CACHED.url, file.name, parseFloat(volume.value));
}
function launchUrl(core, url, title) {
  resetEmu();
  spawnIframe(core, url, title, parseFloat(volume.value));
}
function spawnIframe(core, url, title, vol) {
  emuFrame = document.createElement('iframe');
  emuFrame.style.width = '100%';
  emuFrame.style.height = '100%';
  emuFrame.style.border = '0';
  emuFrame.setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock');
  document.getElementById('game').appendChild(emuFrame);

  const doc = emuFrame.contentDocument;
  doc.open();
  doc.write(`<!doctype html>
<html><head><meta charset="utf-8">
<style>html,body{height:100%;margin:0;background:#000}#game{width:100%;height:100%}</style>
</head><body>
<div id="game"></div>
<script>
  window.EJS_player = '#game';
  window.EJS_core = ${JSON.stringify(core)};
  window.EJS_gameUrl = ${JSON.stringify(url)};
  window.EJS_gameName = ${JSON.stringify(title)};
  window.EJS_pathtodata = 'https://cdn.emulatorjs.org/latest/data/';
  window.EJS_startOnLoaded = true;
  window.EJS_volume = ${vol};
  window.EJS_ready = function(){ parent.postMessage({type:'EJS_READY'}, '*'); };
  window.EJS_onGameStart = function(){ parent.postMessage({type:'EJS_START'}, '*'); };
<\/script>
<script src="https://cdn.emulatorjs.org/latest/data/loader.js" defer></script>
</body></html>`);
  doc.close();
}
window.addEventListener('message', (e) => {
  if (!e?.data || typeof e.data.type !== 'string') return;
  if (e.data.type === 'EJS_READY') { pauseBtn.disabled = false; resumeBtn.disabled = false; }
  if (e.data.type === 'EJS_START') { applyBaseDims(CACHED.core); }
});

async function loadLibrary() {
  try {
    const res = await fetch('games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('games.json missing');
    LIB = await res.json();
  } catch (e) {
    LIB = [];
    console.warn('Library not loaded:', e.message);
  }
  renderLibrary();
}
function renderLibrary() {
  if (!gameList) return;
  const sys = consoleSel.value;
  const q = (searchBox?.value || '').toLowerCase();
  const items = LIB.filter(g => g.system === sys && (!q || g.title.toLowerCase().includes(q)));
  gameList.innerHTML = '';
  if (items.length === 0) {
    gameList.innerHTML = '<p style="color:#a7b3c6">No games found for this system. Put ROMs in <code>public/roms</code> and run <code>npm run build</code> (or upload games.json).</p>';
    return;
  }
  for (const g of items) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img');
    img.alt = g.title;
    img.loading = 'lazy';
    img.src = g.cover || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjMTExOTI2IiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAiIHk9IjE1MCIgZmlsbD0iI2NjZCIgZm9udC1zaXplPSIyNHB4IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg==';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const sysEl = document.createElement('div');
    sysEl.className = 'sys'; sysEl.textContent = g.system.toUpperCase();
    const h3 = document.createElement('h3'); h3.textContent = g.title;
    meta.append(sysEl, h3);
    card.append(img, meta);
    card.addEventListener('click', () => {
      if (consoleSel.value !== g.system) {
        consoleSel.value = g.system;
        consoleSel.dispatchEvent(new Event('change'));
      }
      launchUrl(g.system, g.rom, g.title);
    });
    gameList.appendChild(card);
  }
}

// Init
applyBaseDims(CACHED.core);
setScaleClass('pp3'); // default GBA 3x
startBtn.disabled = true; pauseBtn.disabled = true; resumeBtn.disabled = true;
loadLibrary();
