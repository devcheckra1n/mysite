# Web Retro — Multi‑System Emulator (Vercel‑ready)

Static site that runs multiple classic consoles via EmulatorJS (NES, SNES, N64, GBA, GB, GBC, NDS).

## Quick start
1. Put your ROM files into `public/roms/`.
2. (Optional) Auto‑generate the library + covers (Node 18+):
   ```
   npm run build
   ```
3. Deploy to Vercel:
   - Framework: **Other**
   - Build Command: `npm run build` (or leave empty if you ran step 2 locally)
   - Output Directory: `public`

**Legal:** Only host ROMs you have rights to distribute. Keep repo private or use homebrew/public‑domain titles.
