# Add a famous place

Monuments are block sculptures of real places: the Eiffel Tower, the CN Tower,
Niagara and Iguaçu Falls, MASP, the Wire Opera House. They are drawn in code, one
file each, so a villager can build any of them at any size the ground allows.

They are **original blocky homages** — a silhouette and the proportions a kid
recognises. Nothing is traced from plans, and no logos, signage or branding from
the real place is used. Keep it that way.

## Steps

1. **Write the file**: `src/engine/build/monuments/<name>.ts`, exporting a `Monument`.

   ```ts
   import { plaza } from './shapes';
   import type { Monument, MonumentDraw } from './types';

   export const lighthouse: Monument = {
     id: 'lighthouse',
     label: 'Peggy\'s Cove Lighthouse',
     emoji: '🗼',
     place: 'Nova Scotia, Canada',
     width: 13, depth: 13, height: 18,
     blurb: 'A white tower with a red top that blinks at the sea!',
     draw,
   };

   function draw(m: MonumentDraw): void {
     plaza(m, m.kit.stone);
     for (let y = 1; y <= 14; y++) { /* … m.put(x, m.g + y, z, m.kit.white) … */ }
   }
   ```

   `MonumentDraw` gives you `put`, the `kit` of blocks, the ground level `g`, the
   footprint corners (`x0/x1/z0/z1`), its centre (`cx/cz`), and its size (`w/d`).
   Shared shapes — `plaza`, `box`, `ring`, `disc`, `circle` — are in `shapes.ts`.
   For letters, `font.ts` draws any word in five-block-high type.

2. **Register it**: add the import and the entry to `MONUMENT_LIST` in
   `monuments/index.ts`. That is the only shared file you touch — the tool, the
   chat, the site planner, the panel and the tests all read that list.

3. **Give a kid words for it**: an entry in `MONUMENT_WORDS` in
   `src/engine/chat/buildRequest.ts` (the exact names, including the common
   misspellings), a label in `MONUMENT_LABELS` (`intentFeatures.ts`), and the ways
   people say it in `intentCorpus.ts`. Then `npm run train:intent`.

4. **A city?** `monuments/cities.ts` maps a city name to its landmarks and the word
   for its sign. Asking for the city builds them all, each on its own ground.

## Declare what the real place measures

Every monument carries a `real` block: height, width and depth **in metres**,
the named levels that matter (decks, pods, roofs), and a `source` line saying
where the numbers came from. The drawing then works in metres —

```ts
const deck1 = m.g + m.up(57);   // the Eiffel Tower's first floor, at 57 m of 330
const base = m.across(125);     // and its 125 m square base
```

— because `m.up()` and `m.across()` scale by the monument's own blocks-per-metre.
Change the block height and every level moves with it. Two tests hold this
together: one checks that the block footprint keeps the real width-to-height
ratio, the other that a monument builds as tall as it claims.

Mark a waterfall or a mountain `landscape: true`; a gorge has no facade to
compare.

## Get the proportions from the real thing

Look the place up before you draw it. What makes a monument recognisable is not
detail, it is **ratios**: the Eiffel Tower's floors at 57 m and 115 m of 330 m
(17% and 35%), the CN Tower's pod at 346 m of 553 (63%), Tokyo Tower's decks at
150 m and 250 m of 333, MASP's box only 8 m above the ground over a 74 m span —
long and low, not a tall box on legs. Write the numbers into the comment at the
top of the file so the next person can check your work.

Two of these were wrong on the first pass because they were drawn from memory: the
Eiffel Tower's decks were far too high, and the Eye Museum had its colours the
wrong way round (the eye is white concrete; the base under it is the yellow tiled
part Niemeyer painted himself).

## Rules of thumb

- **Stay inside the footprint.** The site planner hands out exactly `width × depth`
  plus a margin; anything drawn outside lands in the neighbour's garden. A test
  checks every monument for this — it caught the Ibirapuera ramp sprawling out.
- **Rest on the ground.** Overhangs are fine and often the point (MASP hangs, the
  CN Tower's pod sticks out), but most columns should reach something solid.
- **Leave room to walk.** If a kid should be able to go under or through it, prove
  it with a physics test, the way `monuments.test.ts` walks a character under MASP.
- **Water should fall.** For the waterfalls, the test checks the water spans
  several heights — a flat blue rectangle is not a waterfall.

## Machinery that really works

Two stadiums have retractable roofs, and they are not painted on: `automation.ts`
builds them from sticky pistons, wire, repeaters and a lever a child can flip.
Three things about this engine decide the design:

- **A sticky piston pulls back exactly one block**, so each panel is one block
  deep and the slot it closes is two wide. A column of panels would slide in and
  never come home.
- **Wire fades a step a block and dies after fifteen**, so a repeater goes in
  every five — the climb from the ground has already spent half the power before
  the circuit starts.
- **Only wire makes the diagonal step** a staircase needs, so no repeater may sit
  where the stairs meet the rail.

Each of those was a bug first. `monuments.test.ts` flips the lever through the
real `LogicSystem` and checks the roof closes and comes back.

## Check it

```bash
npm test    # monuments.test.ts: footprint, standing up, water, walking under, the words
```
