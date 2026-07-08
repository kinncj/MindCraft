# Gameplay scope

## In the MVP

- One 32×32×16 block world with a starter scene (grass floor, rainbow arch, tree,
  star, light, Magic Delivery Box, welcome sign)
- 13 block types, all available from the start — nothing to unlock
- Place mode and remove mode, switchable by button or right-click
- Orbit camera: drag to rotate, wheel to zoom, WASD/arrows to move
- Hotbar with number-key and click selection
- Magic Delivery Box: store blocks, take them out, rename, empty (with confirmation)
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
