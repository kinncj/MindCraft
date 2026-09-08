# Add a scenario (a prebuilt world)

Toy Land and Sunny Town are **preset maps**: hand-drawn worlds a kid can start
from. Everything is written with `MapBuilder`, in world coordinates, on a flat base.

## Steps

1. **Write the map** in `src/engine/world/generation/maps/<yourMap>.ts`:

   ```ts
   export function buildSpaceStation(floorY = 4): PresetMap {
     const m = new MapBuilder('space', floorY);
     const y = floorY;
     m.box(8, y, 8, 25, y, 35, B.color_white);        // a floor
     m.container(47, y + 1, 47, 'Supply Crate', [{ blockType: 'star', quantity: 5 }]);
     m.villager('builder', 'Nova', 20, 20);           // someone to meet
     return m.finish({ x: 20, y: y + 1, z: 24 });     // where the kid spawns
   }
   ```

   `MapBuilder` has `put`, `box`, `line`, `tree`, `lamp`, `container`, `villager`,
   `pet`, and `vehicle`. Coordinates are absolute; `floorY` is the grass level.
2. **Register it** in `src/engine/world/generation/maps/index.ts`: add the name to
   `PresetName`, an entry in `PRESETS` (label, emoji, description, build), and to
   `isPresetName`.
3. **Offer it in the menu**: a `<ResetWorldDialog preset="space" />` in
   `src/components/MenuPanel.tsx`, and the name in the `worldKind` line above it.
4. **World records**: `src/game/store/worldRecords.ts` already handles any preset —
   it stores `generator: { kind: 'flat', surfaceY, preset }` and the map's entities.

## Check it

```bash
npm test    # presetMaps.test.ts: size, spawn, villagers, and containers
```

Add a case to `tests/unit/presetMaps.test.ts` asserting your landmarks exist, the
spawn is on solid ground, and any container holds what you put in it. Containers
are worth testing: they cross a worker boundary, and a chest that loses its
contents looks exactly like a chest.
