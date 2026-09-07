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
- Friendly animals (bunnies, chicks, butterflies) with rule-based brains; pettable
- Place and remove modes, undo and redo (buttons, Ctrl+Z, controller B)
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
- Works with keyboard and mouse, touch (joystick, jump button, pinch zoom), and
  standard gamepads

## Intentionally excluded

Survival mechanics are excluded on purpose, permanently — not "later":

- No health, hunger, damage, or death
- No monsters, enemies, weapons, or combat of any kind
- No timers, scores, or objectives
- No chat, accounts, multiplayer, or purchases

## Planned next (see README "Roadmap")

A modern menu that fits a phone, a picture recipe crafting book, a logic layer
(buttons, levers, wire, lamps, pistons, a programmable robot), and generated music
with Tone.js.
