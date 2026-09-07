# MindCraft 🧱

A kid-friendly, creative-mode voxel building game that runs entirely in your browser.

The name comes from a 6-year-old who calls Minecraft "MindCraft". This is a game built
for that kid: a familiar block-world feel with original code, original art, and none of
the scary parts. No monsters, no health, no failure — just an endless world of blocks,
animals, weather, a day/night cycle, and a Magic Delivery Box to keep treasures in.

Everything stays on your computer. There is no server, no account, no ads, no tracking.

**Repo:** https://github.com/kinncj/MindCraft — deployable to GitHub Pages as a static SPA.

## What's in the game (2.0)

- An **infinite world** streamed in chunks: continents and hills, lakes and seas,
  caves with glow crystals, and biomes — meadow, forest, cherry grove, desert, snowy
  peaks, rocky hills, beaches — each with its own trees and flowers. A fresh seed on
  every new world, a flat plaza with landmarks at the spawn.
- A playable kid with real physics: walk, run, sneak, jump, swim (and hop out), step
  up single blocks, duck under roofs. First- and third-person cameras; the camera
  never pokes through hills.
- **About 70 blocks** with generated pixel textures: ground, building materials,
  ten color blocks and carpets, **stairs, slabs, doors that open, fences, windows**,
  nature, lights, and furniture (bed, table, chair, bookshelf, TV, painting, cake).
  Every block is one data definition — shape, collision, light, and behavior included.
- **Minecraft-style voxel lighting**, recomputed only around each edit: a sealed
  shelter is pitch-dark until you place a torch; skylight leaks through doors.
- Day/night cycle with stars, rain and snowfall, three visual modes (**Classic**,
  **Ultra**, **Claude Dream**).
- Friendly animals, pets, and villagers driven by a **tiny neural network that runs
  in the browser**: about 600 weights trained in the repo from six personalities,
  deciding every move from what the creature senses (how close you are, whether you
  are running, night, affection, energy, friends nearby). No download, no text.
- **Undo and redo** for everything, a nine-slot hotbar, and a picture palette of all
  blocks. A green ghost shows where a block will land. Beds skip the night. The Magic
  Delivery Box keeps its treasures inside the block itself.
- **Build tools** on a tools bar: a two-tap **Room** tool (floor, hollow walls, a
  doorway), **Fill**, **Paint** (recolor a block in place), **Copy** and **Paste** with
  rotation, a **Mirror** toggle, and six **blueprint cards** (cozy house, castle tower,
  bridge, garden, pool, treehouse) to stamp down and change.
- **A life layer**: chairs you can sit on, TVs and lamps that switch on, a fridge that
  stores food, a stove that sizzles, ladders to climb, a **car** and a **boat** to
  drive, **puppies and kitties** that follow you (rename them, tell them to stay),
  and **villagers with jobs** (baker, farmer, builder, doctor, teacher, firefighter,
  shopkeeper, musician) who chat in pictures, hand out gifts, and play along.
- **Dress up** with a live spinning 3D preview: boy or girl style, shirt, pants or
  skirt, skin, hair, and a hat (cap, crown, cowboy, party).
- **Chat with villagers.** Tap a neighbor and type or tap a chip: "build a house",
  "make a castle", "follow me", "make it night", "can I have a puppy". The villager
  answers and walks over to build it block by block (Undo removes the whole thing).
  Answers come from the game's own rules, from your browser's built-in on-device AI
  if a grown-up turns that on in Menu → Friends, or from an outside agent that
  registers on `window.mindcraftChat`. Nothing is ever downloaded or sent anywhere.
- **Crafting**: a picture recipe book with a tap-to-fill 3×3 grid and a crafting
  table. Recipes teach "this is made of that"; the result lands in the hotbar.
- **Logic and automation**: levers, buttons, pressure plates, wire that fades over
  fifteen blocks, logic lamps, pistons and sticky pistons that push and pull, powered
  doors, and note blocks. A **robot** you program with picture cards (forward, turn,
  up, place, remove, repeat ×N) that builds while you watch.
- **Multiple named worlds** with three presets: a fresh meadow, **Toy Land** (a giant
  bedroom seen from toy size: a huge bed, a bookshelf mountain to climb, giant
  crayons, a toy train on its track, a race track with a real car, a block tower, toy
  soldiers, a friendly dinosaur, a rocket, a piggy bank, balloons, a slide, and the toy
  chest), and **Sunny Town** (a roleplay town: streets with sidewalks and lamps, eight
  painted houses, a school with a playground, a bakery, a fire station with its truck,
  a clinic, a shop, a farm, a construction site, a park with a pool and a stage, a pond
  with a boat, and a neighbor with a job in every building).
- Autosave of edited chunks to IndexedDB, honest save indicator, versioned JSON
  export/import with strict validation. **MindCraft 1.0 saves and export files are
  converted automatically.**
- **Sound, made up on the spot**: a Tone.js soundtrack that follows the biome and the
  time of day (slow and soft at night), footsteps, pops for building, splashes, doors,
  happy pets, crafting sparkles, pistons, and note blocks you can tune. A big mute
  button, a Sound menu, and no audio files at all.
- **Every capability is a tool** — `player_walk_to`, `world_place_block`,
  `build_stamp_blueprint`, `villager_talk`, `pet_adopt`, `vehicle_mount`, … — exposed through WebMCP
  (`navigator.modelContext`) and `window.mindcraftTools`, so agents can play too.
- Works on desktop, tablet, and phone with **keyboard and mouse, touch, or a gamepad**.
  A dark-glass game UI with a crisp SVG icon set drawn in code, a full-screen game
  menu with your character on it, gradient accents, squircle icon badges, layered
  shadows, and springy motion. Every panel is a bottom sheet on phones and a card on bigger
  screens; the menu has submenus with a back button; buttons are thumb-sized and
  respect notches.

## Controls

| Action | Keyboard / mouse | Touch | Gamepad |
|---|---|---|---|
| Walk / run / sneak | `W A S D` or arrows / `Ctrl` / `Shift` | joystick | left stick / L3 / R3 |
| Jump / swim up | `Space` | Jump button | A |
| Look around | drag | drag the world | right stick |
| Zoom | wheel or the ➕ ➖ buttons (all the way in = first person) | pinch or ➕ ➖ | D-pad right cycles |
| Switch camera | `V` or the view button | view button | Y |
| Place / use | click | tap | RT |
| Remove | right-click or Remove mode | Remove mode + tap | LT (or X to switch mode) |
| Pick a block | `1`–`9`, hotbar, `E` for all blocks | hotbar, ➕ More | LB / RB, D-pad up |
| Build tools | Tools button, `R` turns a paste | Tools button | D-pad down cycles, D-pad left turns |
| Interact only | Tools → Interact | Tools → Interact | D-pad down to it |
| Ride / hop off | tap the car or boat, `Space` to hop off (camera follows behind) | tap | RT, A to hop off |
| Chat with a villager | tap them, then type or tap a chip | tap, chips | RT on them, chips |
| Dance | `X` or the ✦ button (friends nearby join in) | ✦ button | — |
| Crafting | `C`, a crafting table, or Menu → Crafting | Menu → Crafting | Start → Crafting |
| Undo / redo | `Ctrl+Z` / `Ctrl+Shift+Z` or buttons | buttons | B |
| Menu | `Escape` or the Menu button | Menu button | Start |

Every keyboard action also has a visible button, so a kid who can't type can still play.

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
to GitHub Pages on every push to `main`. One-time setup: in the repo settings, under
**Pages**, set the source to **GitHub Actions**. The site appears at
`https://kinncj.github.io/MindCraft/`. Details: `docs/operations/github-pages-deployment.md`.

## How your world is saved

Worlds live in the browser's IndexedDB. Only chunks you edited are stored; everything
else regenerates from the world's seed, which keeps an infinite world's save tiny.
**Export World** downloads a version 2 JSON backup; **Import World** adds a world from a
file (version 1 files from MindCraft 1.0 work too). Imported files are data only.

More: `docs/operations/world-export-import.md`, `docs/operations/browser-storage-and-reset.md`.

## Architecture

`src/engine/` is a framework-free voxel engine: chunked world, data-driven blocks with
shapes and behaviors, incremental lighting, per-chunk meshing, swept-box physics, a
voxel raycaster, input from keyboard/mouse/touch/gamepad, brains for creatures, an
undo command layer, and a tool registry. One `Engine` composes small single-purpose
systems on one game loop. React owns only the HUD and panels; a sliced zustand store
sits between. The whole design is in `docs/architecture/adr-0006-v2-engine-foundation.md`
and the tool layer in `adr-0007-tool-registry-and-webmcp.md`. Working rules for
contributors (human or agent) are in `CLAUDE.md`.

## Agents and WebMCP

Open the browser console and try:

```js
await mindcraftTools.list()                                   // every tool with its schema
await mindcraftTools.call('player_walk_to', { x: 20, z: 20 })
await mindcraftTools.call('world_fill', { x1: 0, y1: 60, z1: 0, x2: 4, y2: 62, z2: 4, block: 'color_red' })
await mindcraftTools.call('history_undo')
```

Browsers with WebMCP see the same tools on `navigator.modelContext`.

## Privacy and safety

- No backend, no accounts, no multiplayer, no chat, no ads, no analytics
- No external requests at runtime; all assets are generated in code
- Creative mode only, forever: no health, hunger, damage, death, monsters, weapons,
  combat, or failure states. Night is a cozy navy, never scary.
- Creature "brains" are a tiny neural policy (ADR-0010), not a language model:
  they decide movement, never text, so nothing unmoderated ever talks to a child.

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
- Roblox, Brookhaven, and The Sims are inspirations only; no code, assets, names, or
  designs from them are used.
- The code is MIT-licensed (see `LICENSE`).

## Roadmap

1. ~~World~~ — done: biomes, big oaks, flower meadows, ladders, clouds, particles, ghost
2. ~~Build mode~~ — done: room, fill, paint, copy/paste, mirror, blueprints
3. ~~Life layer~~ — done: furniture, car and boat, pets, villagers with jobs, dress-up
4. ~~UI refresh~~ — done: bottom sheets, a menu with submenus, a tools drawer, safe areas
5. ~~Crafting and logic~~ — done: recipe book, levers/buttons/plates/wire/lamps/pistons/doors/note blocks, robots
6. ~~Sound~~ — done: generative Tone.js soundtrack by biome and time, effects, mute and volume

Nothing before the basics stay boring and reliable.

## Current limitations

- Terrain generation runs in a Web Worker; on very old browsers it runs inline and
  new chunks appear more slowly
- Wild animals respawn fresh each session; pets, villagers, and vehicles are saved
- Ultra mode is realism-inspired, not ray-traced — see `docs/product/visual-modes.md`
