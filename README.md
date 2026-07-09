# MindCraft 🧱

A kid-friendly, creative-mode voxel building game that runs entirely in your browser.

The name comes from a 6-year-old who calls Minecraft "MindCraft". This is a game built
for that kid: a familiar block-world feel with original code, original art, and none of
the scary parts. No monsters, no health, no failure — just blocks, animals, weather, a
day/night cycle, and a Magic Delivery Box to keep treasures in.

Everything stays on your computer. There is no server, no account, no ads, no tracking.

**Repo:** https://github.com/kinncj/MindCraft — deployable to GitHub Pages as a static SPA.

## What's in the game

- A 64×64×32 procedurally generated world: rolling hills, lakes, sandy shores, snowy
  peaks, trees, flowers — a fresh world on every reset
- A playable character with real physics: walk, jump, swim (and hop out of the water),
  step up single blocks, and duck under roofs — shelters actually work
- First-person and third-person cameras — press `V`, tap the view button, or just
  scroll all the way in (your hand shows in first person, with a crosshair)
- **Minecraft-style voxel lighting**: a sealed shelter is pitch-dark inside until you
  place a torch, campfire, light, or star; skylight leaks through doors and windows
- Day/night cycle with stars, plus rain and snowfall — all toggleable in the menu
- Three visual modes: **Classic**, **Ultra** (filmic tone mapping, richer light), and
  **Claude Dream** (a pastel world imagined by code, with drifting sparkles)
- 21 block types with generated 16×16 pixel textures: grass, dirt, stone, cobblestone,
  sand, snow, ice, wood, planks, leaves, flowers, water, cloud, rainbow, star, light,
  torch, campfire, brick, glass, and the Magic Delivery Box
- Friendly animals — bunnies, chicks, butterflies — that wander around and do a happy
  dance when you tap them
- The **Magic Delivery Box**: a cute cardboard storage chest (tape, flap seams, a
  hand-drawn smiley) that opens a storage panel when tapped
- Two world presets: a fresh meadow, or **Toy Land** — a playroom world with a toy
  chest, giant play-block towers, and two original toy statues (a cowboy doll and an
  astronaut toy)
- Autosave to IndexedDB, honest save indicator, JSON export/import with strict
  validation, reset with an export-first option

## Controls

| Action | How |
|---|---|
| Walk | `W A S D` or arrow keys |
| Jump / swim up | `Space` |
| Look around | drag with the mouse (full range — sky to feet) |
| Zoom | mouse wheel (scroll all the way in for first person) |
| Switch camera view | `V` or the view button |
| Place a block | click the ground or a block face (in Place mode) |
| Remove a block | right-click, or switch to Remove mode and click |
| Pick a block | click the hotbar, or press `1`–`9` |
| Open the Magic Delivery Box | tap the box in the world |
| Pet an animal | tap it |
| Menu | `Escape` or the Menu button |

Every keyboard action also has a visible button, so a kid who can't type can still play.

### On tablets and phones

Touch devices get virtual controls automatically:

| Action | How |
|---|---|
| Walk | on-screen joystick (bottom left) |
| Jump / swim up | Jump button (bottom right) |
| Look around | drag anywhere on the world |
| Zoom | pinch with two fingers (pinch all the way in for first person) |
| Place / remove / open / pet | tap, with the Place–Remove toggle |

## Running it

```bash
npm install
npm run dev        # local dev server (the working preview)
npm test           # unit + component tests (Vitest + Testing Library)
npm run test:e2e   # browser tests (Playwright; run `npx playwright install chromium` once)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

## Deploying to GitHub Pages

The included workflow (`.github/workflows/deploy-github-pages.yml`) builds and publishes
to GitHub Pages on every push to `main`. One-time setup:

1. In the repo settings, under **Pages**, set the source to **GitHub Actions**
2. Push to `main`

The site appears at `https://kinncj.github.io/MindCraft/`. The Vite base path switches
to `/MindCraft/` when `GITHUB_PAGES=true` (the workflow sets it); a different repo name
needs `VITE_BASE=/your-name/`. Details: `docs/operations/github-pages-deployment.md`.

## How your world is saved

Worlds live in the browser's IndexedDB — this computer, this browser. Clearing site
data deletes the world; private windows may not save at all (the game warns you and
keeps working). **Export World** downloads a plain JSON backup
(`mindcraft-world-<name>-<date>.json`) with every block, box contents, the selected
block, the visual mode, and the sky/weather settings. **Import World** restores it after
a confirmation that offers to export the current world first. Imported files are data
only: unknown block types are skipped, positions are bounds-checked, quantities are
validated, nothing is ever executed or fetched. Exported files contain no accounts,
passwords, or online data.

More: `docs/operations/world-export-import.md`, `docs/operations/browser-storage-and-reset.md`.

## Visual modes and the shader package

Mode definitions are pure data in `src/shaders/visualModes.ts`; one environment system
(`src/game/engine/environment.ts`) applies them and runs the day/night cycle, stars,
weather particles, and the voxel-light day factor. See `docs/product/visual-modes.md`
and ADR-0005.

## Rendering

Plain Three.js with chunk meshing — the world merges into four meshes (opaque, water,
alpha, glow) with only visible faces emitted, so a full world is ~20k triangles in a
handful of draw calls. Block textures are generated 16×16 pixel canvases packed into an
atlas; lighting is CPU flood-fill (sky + block light) baked into vertex attributes and
combined in a small shader patch with time of day. Quality adapts down gracefully on
software rasterizers. The full story, including two rejected approaches with
measurements, is in `docs/architecture/adr-0003-rendering-approach.md`.

## Privacy and safety

- No backend, no accounts, no multiplayer, no chat, no ads, no analytics
- No external requests at runtime; all assets are generated in code
- Creative mode only, forever: no health, hunger, damage, death, monsters, weapons,
  combat, or failure states. Night is a cozy navy, never scary.

## Trademarks and legal

- MindCraft is an original, fan-made, non-commercial creative building game. It is
  **not** affiliated with, endorsed by, or sponsored by Mojang Synergies AB, Microsoft,
  or the Minecraft brand. **Minecraft is a trademark of Mojang Synergies AB.** This
  project uses no Minecraft code, assets, textures, sounds, or artwork — everything is
  generated by this repository's own code. Game mechanics are not copyrightable; all
  expression here is original.
- The Magic Delivery Box is a generic cardboard delivery box. It is not affiliated with
  Amazon and uses no Amazon trademarks, logos, or trade dress.
- Toy Land's cowboy doll and astronaut toy are original block sculptures of stock toy
  archetypes. They are not affiliated with Disney/Pixar, and no Toy Story characters,
  names, or designs are used.
- The code is MIT-licensed (see `LICENSE`). The name "MindCraft" is used here as the
  title of this free fan project.

## Why the repo looks like this (BusinessRepo)

This repository owns the complete MindCraft capability end to end: the game, the voxel
engine, the shader/visual-mode package, persistence, export/import, tests, deployment
pipeline, and documentation. It is organized around the product, not around technical
layers. Reasoning: `docs/architecture/adr-0001-businessrepo-structure.md`.

## Current limitations

- One world per browser (no world list yet)
- No sound
- Ultra mode is realism-inspired, not ray-traced — see `docs/product/visual-modes.md`
- Animals are decorative and respawn fresh each session

## Future ideas

Multiple named worlds with thumbnails, stickers, blueprints ("build a castle" cards),
parent mode, gentle music with a mute toggle, better touch controls, more animals,
seasons. Nothing before the basics stay boring and reliable.
