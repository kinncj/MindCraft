# Gameplay scope

## In the game

- A 64×64×32 procedurally generated world: rolling hills, lakes with sandy shores,
  snowy peaks, scattered trees and flowers, and a flat spawn plaza with landmarks
  (rainbow arch, star, light, the Magic Delivery Box)
- A playable kid character: walk (WASD/arrows), jump (space), swim, wade, step up
  single blocks, real collision (roofs and shelters work), first- and third-person
  views (V key, view button, or scroll all the way in)
- 21 block types, all available from the start — nothing to unlock
- Minecraft-style voxel lighting: sealed shelters are dark inside until you place a
  torch, campfire, light, or star; sky light leaks through doors and windows
- Day/night cycle (or always-day / always-night), rain and snowfall — all toggleable
  in the menu, never scary
- Three visual modes: Classic, Ultra, and Claude Dream (sparkles!)
- Friendly animals — bunnies, chicks, butterflies — that wander, hop, and love being
  tapped; purely decorative, never obstacles
- Place mode and remove mode, switchable by button or right-click
- Tablet/phone play: an on-screen joystick and jump button appear on touch devices,
  two-finger pinch zooms, drag looks around, tap builds
- Hotbar with number-key and click selection
- Magic Delivery Box: store blocks, take them out, rename, empty (with confirmation)
- Two starter presets: a fresh meadow (new random terrain each reset) and Toy Land
  (a flat playroom with a toy chest, block towers, and two original toy statues)
- Autosave to IndexedDB with a visible save indicator
- Export to JSON file, import from JSON file (validated, confirmed, local-only)
- Reset to starter world (with confirmation and export-first option)

## Intentionally excluded

Survival mechanics are excluded on purpose, permanently — not "later":

- No health, hunger, damage, or death
- No monsters, enemies, or combat of any kind
- No day/night cycle or darkness
- No timers, scores, or objectives

Also out of scope for the MVP (some may come later, see README "Future ideas"):

- Multiple worlds, world naming UI, thumbnails
- Crafting or recipes
- Terrain generation beyond the flat starter world
- Sound and music
- First-person mode
- Touch-optimized camera controls
