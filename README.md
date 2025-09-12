# Web Retro 

Multi-system browser emulator (NES, SNES, N64, GBA, GB, GBC, NDS) built on **EmulatorJS** (RetroArch cores).  
**No ROMs are included** — upload your own legally acquired ROM files from your device.

## Features
- Local ROM upload (works offline after load)
- Pause/Resume (toolbar and buttons)
- Save/Load State via built-in EmulatorJS toolbar (per-game, stored in IndexedDB)
- Volume control (slider)
- Scale / aspect modes: Original (1x), Pixel-Perfect 2x/3x, Fit (preserve AR), Stretch (fill)
- Fullscreen, screenshots, & more via the toolbar

## Run locally
Just open `index.html` in any modern browser. (If you hit cross-origin issues for threads, use a static server.)


## Notes
- This project uses the EmulatorJS CDN for cores and the loader. You can self-host cores by following their docs.
- Save states are stored in your browser storage. Clearing site data will remove them.
- Some systems (PSX/PSP/Sega CD, etc.) require BIOS files. Place paths via `EJS_biosUrl` if you add those systems.
