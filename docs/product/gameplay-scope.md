# Gameplay scope

## In the game

- An **infinite** procedurally generated world streamed in chunks: continents, hills,
  lakes and seas, caves with glow crystals, and biomes (meadow, forest, cherry grove,
  desert, snowy, hills, beach, ocean) with matching trees and flowers
- A playable kid character: walk, run (Ctrl), sneak (Shift), jump, swim, step up single
  blocks, fit under roofs; first- and third-person cameras; the third-person camera
  never clips into hills
- Roughly 88 blocks, all available from the start: ground, building materials, ten
  color blocks and carpets, stairs, slabs, doors that open, fences, window panes,
  nature, lights, and furniture (bed, table, chair, bookshelf, TV, painting, cake)
- Minecraft-style voxel lighting, recomputed only around each edit: sealed shelters
  are dark until lit; sky light leaks through doors and windows
- Day/night cycle (or always-day / always-night), rain and snow, four visual modes (Cinema is the opt-in "AAA" look)
- Friendly animals (bunnies, chicks, butterflies) and pets/villagers driven by a tiny
  on-device neural brain (ADR-0010); pettable
- Place, Interact (tap only), and Remove modes, undo and redo (buttons, Ctrl+Z, controller B)
- A hotbar of nine slots plus a picture palette of every block (E or the ➕ button)
- Magic Delivery Box storage kept inside the box block itself
- Beds: tap to sleep until morning
- Multiple named worlds with three presets: a fresh meadow (new seed each time),
  Toy Land (a bedroom seen from toy size, with a toy chest that really holds toys),
  and Sunny Town (a roleplay town with eight jobs, a school, a clinic and a fire station)
- Autosave of edited chunks to IndexedDB, honest save indicator, export/import of
  version 2 files; version 1 saves and files are converted automatically
- Every capability exposed as a tool (`player_*`, `world_*`, `entity_*`, `time_*`,
  `weather_*`, `camera_*`, `history_*`) via WebMCP and `window.mindcraftTools`
- Build tools: room, fill, paint, copy/paste with rotation, mirror, six blueprint cards
- Buildings, digs and features generated from a sentence (ADR-0015): any type, size,
  material, colour, rooms, doors, stairs, elevators and outdoor features; pools, lakes,
  ponds, bunkers, tunnels, wells and moats; bridges, treehouses, playgrounds, courts,
  gardens and runways. Each one is placed on its own patch of open, level ground, and
  tests walk a character through the result
- Photos: a PNG of the world with none of the buttons in it (camera button, P, or the
  controller's Back button)
- Life layer: sit on chairs, switch TVs and lamps, a fridge that stores, a stove that
  sizzles, ladders; rides with arcade-real physics (car, motorbike, boat, airplane,
  helicopter); creative flight; flowing water; puppies and kitties that follow, stay, or swim;
  villagers with eight pretend jobs, picture dialogue, gifts, and "let's play"
- Dress-up with a live 3D preview: boy/girl style, shirt, pants/skirt, skin, hair, hats
- Villager chat (ADR-0011, ADR-0016): rules backed by a small trained intent model in
  the bundle, an optional helper model a grown-up downloads (ADR-0012), the browser's
  built-in on-device model behind a parent toggle, or an outside agent. Anything the
  child describes — a hospital with doctors, a school with six classrooms, a 30 by 20
  lake, an airport with a runway, a lamp post that blinks — is generated to order and
  built by hand, undoable
- Crafting: a picture recipe book (38 recipes) with a tap-to-fill grid; crafting table
- Logic: lever, button, pressure plate, wire (fades over 15 blocks, and climbs a step),
  logic lamp, repeaters that pass power on at full strength so a circuit can run past
  fifteen blocks, flip blocks that turn power the other way round — no power in means
  full power out, one tick later, so a flip block wired back into itself blinks —
  pistons facing all six ways that push up to 12 blocks and sticky
  pistons that pull one back, powered and automatic doors, note blocks; a 10 Hz tick
- Robots: card programs (forward, back, left, right, turn, up, down, place, remove,
  wait, repeat ×N), one step every half second, persisted with the world
- Works with keyboard and mouse (a desktop grabs the pointer like a block game; a
  trackpad can stay on click-to-build with `?mouse=tap`), touch (joystick, jump button,
  pinch zoom), and standard gamepads

## Intentionally excluded

Survival mechanics are excluded on purpose, permanently — not "later":

- No health, hunger, damage, or death
- No monsters, enemies, weapons, or combat of any kind
- No timers, scores, or objectives
- No chat, accounts, multiplayer, or purchases

- Sound: a generative Tone.js soundtrack by biome and time of day, effects for
  building, walking, doors, pets, crafting, pistons, and tunable note blocks; mute,
  music toggle, and three volume levels

## Planned next

Polish and whatever the kid asks for next. See the README roadmap.
