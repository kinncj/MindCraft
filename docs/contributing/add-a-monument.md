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

   Two traps live here. **The speller's `VOCABULARY` is a list of words it will
   pull other words towards**: adding `rome` turned "computer room" into
   "computer rome", and `gate` and `leaning` sit one letter from "get" and
   "learning". Leave a name out of the vocabulary if a child's ordinary word is
   one edit away — the regex still matches it spelled correctly. And **do not
   take a word the game already means**: a plain "pyramid" is the pyramid
   *shape*, so the Great Pyramid answers to "the great pyramid", "Giza", "Egypt"
   and "the Sphinx" instead, with a test pinning "a huge pyramid" to the shape.

4. **A city?** `monuments/cities.ts` maps a city name to its landmarks and the word
   for its sign. Asking for the city builds them all, each on its own ground.
   A city is read before a monument (so "São Paulo" is not a building called
   Paulo), but a landmark named outright wins over the city it stands in —
   "tower bridge in london" builds the bridge, not the whole of London.

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

**`across()` scales off the height, not the width.** That is right for anything
whose block footprint keeps the real ratio, and wrong for something very long
and very low: on the Golden Gate, `m.across(640)` for the half-span put the
towers forty-eight blocks out of a fifty-one block footprint, because the
blocks-per-metre comes from 227 m of tower. For a bridge like that, place the
towers as a fraction of `m.w` and keep `up()` for the heights.

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

## Look at it

```bash
npm run elevation -- eiffel          # front and side, block by block
npm run elevation -- arena_baixada plan
npm run elevation -- rideau_canal section   # a slice down the middle
npm run elevation --                 # what there is
```

The **plan** catches what a facade cannot: Copán's S-curve and the Burj
Khalifa's Y are invisible from the front and obvious from above. The
**section** is a true slice rather than a silhouette, so it shows what is
hollow and is the only view that reaches below the ground — the Rideau Canal's
whole channel and the Colosseum's hypogeum are down there.

An elevation is the fastest way to see whether a monument reads: it prints the
silhouette in a second, one letter per material (`o` glass, `~` water, `+` wire,
`P` piston, `L` lever, a capital for each colour). Every visual bug so far was
obvious the moment it was printed and invisible in the code:

- The Skytree's shaft **vanished above the lower deck** — a negative base to a
  fractional power gives `NaN`, and a `NaN` radius draws nothing.
- The Eiffel Tower braced its legs with solid slabs, so the ironwork read as a
  wall rather than a lattice.
- Christ the Redeemer had a four-block head on an eighteen-block figure.
- The greenhouse was drawn as a height field, so its domes had **no sides**.
- Science World was a **solid white ball**: a geodesic dome with no geodesics.
- Tower Bridge built its pinnacles on top of the 65 m mark instead of inside it,
  so it stood twenty-two blocks while claiming sixteen — the height test caught
  that one before the elevation did.

A screenshot of the running game is the slow way to learn the same things: it
takes minutes per shot and mostly photographs the hillside in front of the thing.

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
- **Clear the bumps, not the sky.** A build is capped at 20,000 blocks. Clearing
  the air above the whole footprint costs `width × depth × height` on its own:
  on the Great Pyramid's 37 by 37 that was 35,000 blocks before a single stone
  was laid. Five blocks of headroom takes the grass and the trees, which is all
  the clearing was ever for.

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
