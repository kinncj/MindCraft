# MindCraft 🧱

[![Tests](https://github.com/kinncj/MindCraft/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/kinncj/MindCraft/actions/workflows/test.yml)
[![Deploy](https://github.com/kinncj/MindCraft/actions/workflows/deploy-github-pages.yml/badge.svg?branch=main)](https://github.com/kinncj/MindCraft/actions/workflows/deploy-github-pages.yml)

A kid-friendly, creative-mode voxel building game that runs entirely in your browser.

MindCraft is for small kids: craft whatever you have in mind. A familiar block-world
feel with original code, original art, and none of the scary parts. No monsters, no
health, no failure — just an endless world of blocks, animals, weather, a day/night
cycle, and a Magic Delivery Box to keep treasures in.

Everything stays on your computer. There is no server, no account, no ads, no tracking.

**Repo:** https://github.com/kinncj/MindCraft — deployable to GitHub Pages as a static SPA.
**Docs:** everything written down about the game is indexed in [`docs/README.md`](docs/README.md).
**Contributing (human or AI):** [`AGENTS.md`](AGENTS.md) and the playbooks in
[`docs/contributing/`](docs/contributing/) — adding blocks, characters, scenarios, tools,
buildings, or teaching the sentence model. Ready-made setups for Claude Code, Cursor,
Copilot, Kiro, Qwen Code and opencode are in the repo.

## What's in the game (2.0)

- An **infinite world** streamed in chunks: continents and hills, lakes and seas,
  caves with glow crystals, and biomes — meadow, forest, cherry grove, desert, snowy
  peaks, rocky hills, beaches — each with its own trees and flowers. A fresh seed on
  every new world, a flat plaza with landmarks at the spawn.
- A playable kid with real physics: walk, run, sneak, jump, swim (and hop out), step
  up single blocks, duck under roofs. First- and third-person cameras; the camera
  never pokes through hills.
- **About 85 blocks** with generated pixel textures: ground, building materials,
  ten color blocks and carpets, **stairs, slabs, doors that open, fences, windows**,
  nature, lights, and furniture (bed, table, chair, bookshelf, TV, painting, cake).
  Every block is one data definition — shape, collision, light, and behavior included.
- **Minecraft-style voxel lighting**, recomputed only around each edit: a sealed
  shelter is pitch-dark until you place a torch; skylight leaks through doors.
- Day/night cycle with stars, rain and snowfall, four visual modes (**Classic**,
  **Ultra**, **Claude Dream**, and **Cinema**: physically based materials with
  generated normal and roughness maps, a real sky baked into reflections and
  fill light, 4K shadows; opt-in, needs a good device).
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
  bridge, garden, pool, treehouse) to stamp down and change. Asking a villager in words
  goes to the generator instead, so a bridge or treehouse comes out any size and colour.
- **A life layer**: chairs you can sit on, TVs and lamps that switch on, a fridge that
  stores food, a stove that sizzles, ladders to climb, rides with real-feel physics
  (a **car** that brakes and grips, a **motorbike** that leans, a **boat**, an
  **airplane** that needs runway speed to take off, a **helicopter** that hovers),
  **creative flight** (double-tap Jump), **flowing water** that pours, spreads, and
  drains like the real thing, **puppies and kitties** that follow you (and swim),
  and **villagers with jobs** (baker, farmer, builder, doctor, teacher, firefighter,
  shopkeeper, musician) who chat in pictures, hand out gifts, and play along.
- **Dress up** with a live spinning 3D preview: boy or girl style, shirt, pants or
  skirt, skin, hair, and a hat (cap, crown, cowboy, party).
- **Buildings proven by walking.** Every generated building passes livability rules
  (doors on the ground and clear, stairs with real clearance, lit rooms with doorways)
  and tests drive the actual character up the stairs, through the doors, down into
  bunkers, and along tunnels. Villagers dig too: pools, lakes, ponds, bunkers, tunnels,
  wells, moats. Bridges, treehouses, playgrounds, courts, and gardens come out any size and
  any colour, beside a building or on their own.
- **A little model of our own, trained on how kids type.** Alongside the word lists,
  a classifier trained in this repo that ships in the bundle (no download) reads misspellings and
  roundabout phrasings — "a hosptial", "skool", "somewhere for the sick people to go" —
  and maps them onto the same builder. It also reads a whole sentence at a time:
  "build a school and dig a big lake and then make it night" is three jobs, done in
  order, while "a school with 6 classrooms and a computer room" stays one school. Airports
  come with a runway a plane can really take off from, and public buildings get sliding doors.
  Each thing gets its own patch of open, level ground — the villager looks for somewhere clear
  rather than piling the next build on the last one — and plain land means plain land:
  roads, plazas and courts are left alone even though they look flat and empty.
  `npm run train:intent` retrains it from the sentences in `src/engine/chat/intentCorpus.ts`.
  How it was built, end to end: `docs/ai/how-we-built-the-little-model.md`.
- **Famous places, in blocks.** Ask for the **Eiffel Tower**, the **CN Tower**, the
  **Rogers Centre**, Ottawa's **Peace Tower** and **Rideau Canal**, Curitiba's **Eye
  Museum**, **Wire Opera House** and **Botanical Garden**, São Paulo's **MASP**,
  **Copan** and **Ibirapuera Auditorium**, or **Niagara** and **Iguaçu Falls** — with
  water that really falls. Ask for a whole city ("build Curitiba") and its landmarks go
  up side by side with the name in giant letters. A sign can spell anything: "a sign
  that says KINN". They are original block sculptures, one file each in
  `src/engine/build/monuments/`.
- **Chat with villagers.** Say what you want in your own words: "a beautiful and
  colourful brick mansion, like a massive house" becomes a three-floor brick house
  with rainbow pillars, glass windows, a door, a stepped roof, and a chimney. Houses
  and castles are built to order (size, floors, material, colours) rather than from
  fixed blueprints, and villagers lay the blocks by hand. Tap a neighbor and type or tap a chip: "build a house",
  "make a castle", "follow me", "make it night", "can I have a puppy". The villager
  answers and walks over to build it block by block (Undo removes the whole thing).
  Answers come from the game's own rules, from a **small language model a grown-up
  can download once** (Qwen 2.5 0.5B, about 400 MB, kept on the device, run with
  WebLLM on WebGPU), from your browser's built-in on-device AI if it has one, or from
  an outside agent that registers on `window.mindcraftChat`. Nothing the child types
  ever leaves the device.
- **Crafting**: a picture recipe book with a tap-to-fill 3×3 grid and a crafting
  table. Recipes teach "this is made of that"; the result lands in the hotbar.
- **Logic and automation** like the real thing: pistons face all six ways and push up to
  twelve blocks, sticky pistons pull one back, wire climbs steps; ask a villager for "a
  house with a piston door" and get four sticky pistons on one lever. Levers, buttons, pressure plates, wire that fades over
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
- **Every capability is a tool** — `player_walk_to`, `world_place_block`, `build_house`,
  `build_dig`, `build_feature`, `villager_talk`, `pet_adopt`, `vehicle_mount`, … — exposed through WebMCP
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
| Walk / run / sneak | `W A S D` or arrows / `Ctrl` / `Shift` | touch anywhere in the lower-left and drag (the joystick appears under your finger) | left stick / L3 / R3 |
| Jump / swim up | `Space` | Jump button | A |
| Look around | click the world once to grab the mouse, then move it (`Esc` lets go); trackpads can still drag | drag the world | right stick |
| Zoom | wheel or the ➕ ➖ buttons (all the way in = first person) | pinch or ➕ ➖ | D-pad right cycles |
| Switch camera | `V` or the view button | view button | D-pad up |
| Place / use | right-click with the mouse grabbed (plain click when not) | tap | LT |
| Remove | left-click with the mouse grabbed (right-click when not, or Remove mode) | Remove mode + tap | RT (or X to switch mode) |
| Pick a block | `1`–`9`, mouse wheel when grabbed, `E` for all blocks | hotbar, ➕ More | LB / RB, Y for all blocks |
| Build tools | Tools button, `R` turns a paste | Tools button | D-pad down cycles, D-pad left turns |
| Interact only | Tools → Interact | Tools → Interact | D-pad down to it |
| Fly | double-tap `Space` or the 🪽 button; hold `Space` to rise, `Shift` to sink, land to stop | double-tap Jump / 🪽 | double-tap A |
| Ride / hop off | tap a ride and choose Ride it, or ask a neighbor to drive or fly it; `Space` hops off ground rides, `E` any ride (camera follows behind) | tap it again | RT, A hops off ground rides |
| Fly a plane / helicopter | `W` throttle up, `S` down, `A D` bank or turn, `Space` climb, `Shift` dive or land | joystick + Jump | left stick, A |
| Chat with a villager | tap them, then type or tap a chip | tap, chips | RT on them, chips |
| Dance | `X` or the ✦ button (friends nearby join in) | ✦ button | — |
| Take a photo | `P` or the camera button | camera button | Back |
| Crafting | `C`, a crafting table, or Menu → Crafting | Menu → Crafting | Start → Crafting |
| Undo / redo | `Ctrl+Z` / `Ctrl+Shift+Z` or buttons | buttons | B |
| Menu | `Escape` or the Menu button | Menu button | Start |

Every keyboard action also has a visible button, so a kid who can't type can still play.

## Helper sizes

A grown-up picks the helper size in Menu → Friends: **Fast** (Qwen 2.5 0.5B, about
400 MB, phones and tablets), **Smart** (1.5B, about 1 GB, laptops and iPad Pro), or
**Smartest** (3B, about 2 GB, desktops with a graphics card). Bigger models follow
long, detailed requests far better. Whatever the model answers, the child's own words
are parsed too: a building request is always built from the words (type, size, floors,
material, colours, furniture, people, flag), so a small model that copies its example
still produces the right building.

## Photos

The camera button on the right (or **P**, or the controller's Back button) saves a PNG of
the world exactly as it looks — no buttons, no ghost block, no highlight. The picture is
read out of the same frame it is drawn, so nothing slows down when the camera is not used.

## Performance on older laptops

The engine reads the graphics chip's name and starts on a budget that fits it: a 2022
Ryzen or Intel laptop with integrated graphics gets a canvas at most 1.25× display
scaling, a 2K shadow map refreshed every other frame, six chunks of draw distance,
and no post-processing; graphics cards and Apple chips get everything. Detail also
falls off with distance: flowers, grass and mushrooms have their own draw pass and
stop two chunks before the draw distance ends, and only nearby chunks cast sun
shadows, so a weak GPU spends its fill rate on what is close. Chunk meshing
runs in worker threads. If the frame rate still stays under 34 fps, every mode eases
off one notch at a time (post-processing, canvas size, shadows, draw distance, and for
Cinema finally Ultra) with a toast each time. `?debug=true` shows the chip, its class,
the profile, and the live frame time.

## Debugging the helper

Open the game with `?debug=true` to get a small overlay with the helper model that
was chosen, whether it runs in a worker or on the main thread, GPU limits, loading
progress, thinking time, the exact prompt, the raw model output, and any error, plus
a **Test the helper** button. `?power=high` forces the full renderer on software GL.
`?mouse=tap` swaps the desktop's grab-the-pointer scheme for plain click-to-build
(handy on a trackpad, and what the browser tests drive); `?mouse=game` forces the
grabbing scheme anywhere.

## Running it

```bash
npm install
npm run dev          # local dev server (the working preview)
npm test             # unit + component tests (Vitest + Testing Library)
npm run test:e2e     # browser tests (Playwright; run `npx playwright install chromium` once)
npm run lint         # typecheck the whole project (tsc -b)
npm run build        # typecheck + production build into dist/
npm run preview      # serve the production build locally
npm run train:brain  # retrain the creature brain into src/engine/ai/weights.ts
npm run train:intent # retrain the sentence model into src/engine/chat/intentWeights.ts
```

`npm run lint` is the typecheck that matters: a bare `npx tsc --noEmit` checks nothing
here, because the root `tsconfig.json` only holds project references.

## Deploying to GitHub Pages

Every push to `main` runs the **Tests** workflow (unit and component tests, then the
browser tests). Only a green run triggers `.github/workflows/deploy-github-pages.yml`,
which builds that exact commit and publishes it — so a red suite never reaches a child.
A manual run (**Actions → Deploy to GitHub Pages → Run workflow**) publishes whatever is
on `main`, for a docs-only change or a hotfix. One-time setup: in the repo settings, under
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
- No external requests at runtime; all assets are generated in code. The one
  exception is the optional helper model, downloaded only when a grown-up taps
  "Download" in Menu → Friends and confirms the size (ADR-0012)
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
- The monuments are original blocky homages to real places, drawn in this repository's
  own code from public silhouettes and proportions. No plans, photographs, models,
  logos, signage, or branding from the real buildings, their owners, or their architects
  are used, and nothing here is affiliated with or endorsed by any of them.
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
7. ~~Words to buildings~~ — done: any building, dig or feature from a sentence, proven
   walkable by physics tests, each on its own patch of open ground
8. ~~A model of our own~~ — done: a 42 KB sentence model trained in the repo, shipped in
   the bundle, no download

Nothing before the basics stay boring and reliable.

## Current limitations

- Terrain generation runs in a Web Worker; on very old browsers it runs inline and
  new chunks appear more slowly
- Wild animals respawn fresh each session; pets, villagers, and vehicles are saved
- Ultra mode is realism-inspired, not ray-traced — see `docs/product/visual-modes.md`
- The built-in sentence model recognises the things this game can build; it does not
  converse, and a brand-new word lands on the nearest thing it knows or on a shrug.
  Conversation comes from the rules, or from the optional downloaded helper
