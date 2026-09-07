# Gameplay scope

## In the game

- An **infinite** procedurally generated world streamed in chunks: continents, hills,
  lakes and seas, caves with glow crystals, and biomes (meadow, forest, cherry grove,
  desert, snowy, hills, beach, ocean) with matching trees and flowers
- A playable kid character: walk, run (Ctrl), sneak (Shift), jump, swim, step up single
  blocks, fit under roofs; first- and third-person cameras; the third-person camera
  never clips into hills
- Roughly 70 blocks, all available from the start: ground, building materials, ten
  color blocks and carpets, stairs, slabs, doors that open, fences, window panes,
  nature, lights, and furniture (bed, table, chair, bookshelf, TV, painting, cake)
- Minecraft-style voxel lighting, recomputed only around each edit: sealed shelters
  are dark until lit; sky light leaks through doors and windows
- Day/night cycle (or always-day / always-night), rain and snow, three visual modes
- Friendly animals (bunnies, chicks, butterflies) and pets/villagers driven by a tiny
  on-device neural brain (ADR-0010); pettable
- Place, Interact (tap only), and Remove modes, undo and redo (buttons, Ctrl+Z, controller B)
- A hotbar of nine slots plus a picture palette of every block (E or the ➕ button)
- Magic Delivery Box storage kept inside the box block itself
- Beds: tap to sleep until morning
- Multiple named worlds with two presets: a fresh meadow (new seed each time) and
  Toy Land (a flat playroom with a toy chest, block towers, and two toy statues)
- Autosave of edited chunks to IndexedDB, honest save indicator, export/import of
  version 2 files; version 1 saves and files are converted automatically
- Every capability exposed as a tool (`player_*`, `world_*`, `entity_*`, `time_*`,
  `weather_*`, `camera_*`, `history_*`) via WebMCP and `window.mindcraftTools`
- Build tools: room, fill, paint, copy/paste with rotation, mirror, six blueprint cards
- Life layer: sit on chairs, switch TVs and lamps, a fridge that stores, a stove that
  sizzles, ladders; a drivable car and boat; puppies and kitties that follow or stay;
  villagers with eight pretend jobs, picture dialogue, gifts, and "let's play"
- Dress-up: shirt, pants, skin, hair, hats
- Crafting: a picture recipe book (36 recipes) with a tap-to-fill grid; crafting table
- Logic: lever, button, pressure plate, wire (fades over 15 blocks), logic lamp, piston
  and sticky piston (push/pull up to 8 blocks), powered doors, note blocks; a 10 Hz tick
- Robots: card programs (forward, back, left, right, turn, up, down, place, remove,
  wait, repeat ×N), one step every half second, persisted with the world
- Works with keyboard and mouse, touch (joystick, jump button, pinch zoom), and
  standard gamepads

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
