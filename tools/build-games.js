// Node 18+ (uses global fetch). Run: npm run build
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ROOT       = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const ROMS_DIR   = path.join(PUBLIC_DIR, "roms");
const COVERS_DIR = path.join(PUBLIC_DIR, "covers");
const OUT_JSON   = path.join(PUBLIC_DIR, "games.json");

// ext → system
const EXT_TO_SYS = {
  ".nes":"nes", ".sfc":"snes", ".smc":"snes",
  ".gba":"gba", ".gb":"gb", ".gbc":"gbc",
  ".n64":"n64", ".z64":"n64", ".v64":"n64",
  ".nds":"nds"
};

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
// Safe cross-platform “to /” conversion (no regex needed)
const toPosix = (p)=>p.split(path.sep).join("/");

function slugify(s){
  return s.toLowerCase().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function cleanTitleFromFilename(name){
  const base = name.replace(/\.[^.]+$/, "");
  let t = base
    .replace(/[_\.]/g," ")
    .replace(/\s*\([^)]*\)\s*/g," ")
    .replace(/\s*\[[^\]]*\]\s*/g," ")
    .replace(/\s{2,}/g," ")
    .trim();
  t = t.split(" ").map(w => /^(of|the|and|a|an|vs\.?|in|on|for|to)$/i.test(w) ? w.toLowerCase() : (w[0]?.toUpperCase()||"")+w.slice(1)).join(" ");
  return t;
}

async function listFilesRecursive(dir){
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes:true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await listFilesRecursive(p));
    else out.push(p);
  }
  return out;
}
async function ensureDirs(){
  await fs.mkdir(ROMS_DIR,   { recursive:true });
  await fs.mkdir(COVERS_DIR, { recursive:true });
}

// Get a cover image via Wikipedia API (best-effort)
async function wikipediaCoverURL(title){
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action","query");
  url.searchParams.set("format","json");
  url.searchParams.set("generator","search");
  url.searchParams.set("gsrsearch", title);
  url.searchParams.set("gsrlimit","1");
  url.searchParams.set("prop","pageimages");
  url.searchParams.set("piprop","original|thumbnail");
  url.searchParams.set("pithumbsize","600");

  const res = await fetch(url, { headers:{ "User-Agent":"web-retro-builder/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  return page?.original?.source || page?.thumbnail?.source || null;
}
async function downloadTo(url, outPath){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

async function build(){
  await ensureDirs();
  const files = (await listFilesRecursive(ROMS_DIR))
    .filter(p => EXT_TO_SYS[path.extname(p).toLowerCase()]);

  const games = [];
  for (const abs of files) {
    const rel      = toPosix(path.relative(PUBLIC_DIR, abs));   // e.g. roms/game.gba
    const ext      = path.extname(abs).toLowerCase();
    const system   = EXT_TO_SYS[ext];
    const filename = path.basename(abs);
    const title    = cleanTitleFromFilename(filename);
    const id       = slugify(`${system}-${title}`);

    let coverRel   = `covers/${id}.jpg`;
    const coverAbs = path.join(PUBLIC_DIR, coverRel);

    let haveCover = true;
    try { await fs.access(coverAbs); } catch { haveCover = false; }

    if (!haveCover) {
      try {
        const imgURL = await wikipediaCoverURL(`${title} video game`) || await wikipediaCoverURL(title);
        if (imgURL) { await downloadTo(imgURL, coverAbs); await sleep(400); }
        else { coverRel = ""; }
      } catch (e) {
        console.warn("cover fetch failed:", title, e.message);
        coverRel = "";
      }
    }

    games.push({ id, title, system, rom: rel, cover: coverRel });
  }

  games.sort((a,b)=>a.title.localeCompare(b.title));
  await fs.writeFile(OUT_JSON, JSON.stringify(games, null, 2));
  console.log(`Wrote ${games.length} entries to ${toPosix(path.relative(ROOT, OUT_JSON))}`);
}

build().catch(e => { console.error(e); process.exit(1); });