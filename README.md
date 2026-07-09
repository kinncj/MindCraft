# MindCraft 🧱

A kid-friendly creative block-building game that runs entirely in your browser.

The name comes from a 6-year-old who calls Minecraft "MindCraft". This is a game built for
that kid: bright colors, big buttons, no monsters, no timers, no failure. Just blocks,
a small world, and a Magic Delivery Box to keep treasures in.

**Play it:** build blocks, save automatically, export your world to a file, bring it back later.
Everything stays on your computer. There is no server, no account, no ads, no tracking.

## What's in the game

- A 32×32 block world with a grass floor, a rainbow arch, a little tree, and a Magic Delivery Box
- 13 block types: grass, dirt, stone, wood, leaves, water, cloud, rainbow, star, light, brick, glass, and the Magic Delivery Box
- Chunky 16×16 pixel-art textures (generated in code — no copied assets), soft sun shadows, clouds
- The Magic Delivery Box looks the part: kraft cardboard, packing tape, flap seams, and a hand-drawn smiley
- Place and remove blocks with mouse, keyboard, or the big on-screen buttons
- The Magic Delivery Box: a friendly cardboard box that stores blocks (tap it to open)
- Autosave to the browser (IndexedDB), with a small "Saved on this computer" indicator
- Export the world to a JSON file, import it back later — fully local, no cloud
- Reset to the starter world, with a chance to export first

## Controls

| Action | How |
|---|---|
| Move camera | `W A S D` or arrow keys |
| Rotate camera | drag with the mouse |
| Zoom | mouse wheel |
| Place a block | click the ground or a block face (in Place mode) |
| Remove a block | right-click, or switch to Remove mode and click |
| Pick a block | click the hotbar, or press `1`–`9` |
| Open the Magic Delivery Box | tap the box in the world |
| Close panels | `Escape` or the Close button |

Every keyboard action also has a visible button, so a kid who can't type can still play.

## Running it

```bash
npm install
npm run dev        # local dev server
npm test           # unit + component tests (Vitest + Testing Library)
npm run test:e2e   # browser tests (Playwright; run `npx playwright install chromium` once)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

## Deploying to GitHub Pages

The included workflow (`.github/workflows/deploy-github-pages.yml`) builds and publishes
to GitHub Pages on every push to `main`. One-time setup:

1. Push this repo to GitHub as `mindcraft`
2. In the repo settings, under **Pages**, set the source to **GitHub Actions**
3. Push to `main`

The Vite base path is set to `/mindcraft/` when `GITHUB_PAGES=true` (the workflow sets it).
If your repo has a different name, set `VITE_BASE=/your-repo-name/` in the workflow.
See `docs/operations/github-pages-deployment.md` for details.

## How your world is saved

Worlds are saved in the browser using IndexedDB. That means:

- The world lives on the computer and browser where it was built
- Clearing browser data deletes the world
- Private/incognito windows may not save at all (the game warns you and keeps working)

To keep a world safe, use **Export World**. It downloads a plain JSON file
(`mindcraft-world-<name>-<date>.json`) with every block, the Magic Delivery Box contents,
and the selected block. **Import World** brings it back, after a confirmation that also
offers to export the current world first. Imported files are treated strictly as data:
unknown block types are skipped, positions are bounds-checked, and nothing in the file is
ever executed or fetched. Exported files contain no accounts, passwords, or online data.

More detail: `docs/operations/world-export-import.md` and
`docs/operations/browser-storage-and-reset.md`.

## Privacy and safety

- No backend, no accounts, no multiplayer, no chat
- No analytics, no ads, no external requests at runtime
- No violence, monsters, health, hunger, or failure states — creative mode only

## Why the repo looks like this (BusinessRepo)

This repository owns the complete MindCraft capability end to end: the game, the engine,
the persistence layer, the export/import format, the tests, the deployment pipeline, and
the documentation. It is organized around the product, not around technical layers — there
is no separate `frontend` or `shared-components` repo to chase. If you want to change
MindCraft, everything you need is here. The reasoning is written down in
`docs/architecture/adr-0001-businessrepo-structure.md`.

## Rendering choice

Three.js with plain (non-React) scene management: one shared box geometry, cached
materials per block type, one mesh per block. A full floor plus builds is ~1,100 meshes,
which any laptop handles. Block textures are 16×16 pixel canvases generated in code at
startup (no image assets, all original art), rendered with nearest-neighbor filtering for
the classic chunky-pixel look, plus soft sun shadows and a few clouds. The same generated
pixels are used as hotbar and panel icons. React owns the UI; the canvas is imperative.
The alternatives considered and the trade-offs are in
`docs/architecture/adr-0003-rendering-approach.md`.

## Current limitations

- One world per browser (no world list yet)
- No touch-drag camera on mobile (tap to place works)
- No sound
- Removing a large build block-by-block is slow — there is no area-fill tool
- The camera is orbit-style, not first-person

## Future ideas

Multiple named worlds with thumbnails, stickers, simple blueprints ("build a castle" cards),
a parent mode, gentle music with a mute toggle, better touch controls. None of these before
the basics stay boring and reliable.
