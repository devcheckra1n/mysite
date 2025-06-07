// public/app.js

// ── Entry Screen & Profile Reveal ──────────────────────────────────────────
const entry = document.getElementById('entry-screen');
const profile = document.getElementById('profile');
entry.addEventListener('click', () => {
  entry.classList.add('fade-out');
  // Reveal profile immediately
  profile.hidden = false;
  typewriter();     // start typing your hard-coded name
  initAudio();      // start background audio
  // After fade completes, hide entry element
  entry.addEventListener('transitionend', () => {
    entry.style.display = 'none';
  }, { once: true });
});

// ── Matrix Rain (restored original cascade, slower, with startup effect) ───
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
let W, H, cols, drops;
const fontSize = 18;
const speed = 0.6; // slower fall speed

// Combined non-Latin characters + digits
const chars = (
  "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" +
  "的一是不了有和人这中大为上个国我以要他" +
  "あいうえおかきくけこさしすせそたちつてと" +
  "අආඇඈඉඊඋඌඍඎඑඒඔඕකුඛග" +
  "0123456789"
).split('');

// Initialize canvas and drops
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  cols   = Math.floor(W / fontSize);
  // Startup effect: start drops at random negative positions
  drops  = Array(cols).fill(0).map(() => -Math.random() * (H / fontSize));
}
window.addEventListener('resize', resize);
resize();

function draw() {
  // fade the canvas slightly
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FF69B4';
  ctx.font = `${fontSize}px monospace`;

  for (let i = 0; i < cols; i++) {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    ctx.fillText(ch, x, y);

    // reset drop after it goes off screen to negative for re-entry
    if (drops[i] * fontSize > H && Math.random() > 0.975) {
      drops[i] = -Math.random() * (H / fontSize);
    }
    // increment drop by fractional speed for slower effect
    drops[i] += speed;
  }

  requestAnimationFrame(draw);
}
// Kick off initial cascade
requestAnimationFrame(draw);

// ── Typewriter for hard-coded username ────────────────────────────────────
function typewriter() {
  const text = "parisysl";  // <-- replace with your actual username
  const el = document.getElementById('username');
  let i = 0, deleting = false;
  const tSpeed = 120, dSpeed = 80, pause = 1000;

  (function tick() {
    if (!deleting) {
      el.textContent = text.slice(0, i + 1);
      i++;
      if (i === text.length) {
        deleting = true;
        setTimeout(tick, pause);
      } else {
        setTimeout(tick, tSpeed);
      }
    } else {
      el.textContent = text.slice(0, i - 1);
      i--;
      if (i === 0) {
        deleting = false;
        setTimeout(tick, pause / 2);
      } else {
        setTimeout(tick, dSpeed);
      }
    }
  })();
}

// ── Background audio: random selection ─────────────────────────────────────
const audio = document.getElementById('bg-audio');
let tracks = [];

function initAudio() {
  fetch('/api/audio-files')
    .then(r => r.json())
    .then(list => {
      tracks = list;
      playRandom();
      audio.addEventListener('ended', playRandom);
    })
    .catch(console.error);
}

function playRandom() {
  if (!tracks.length) return;
  const choice = tracks[Math.floor(Math.random() * tracks.length)];
  audio.src = `/music/${choice}`;
  audio.play().catch(console.warn);
}
