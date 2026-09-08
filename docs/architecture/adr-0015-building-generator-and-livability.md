# ADR-0015: Buildings from words, and the rules every building must pass

Status: accepted (2026-09-07)

## Context

Kids type whatever they have in mind: "a huge hospital fully furnished with
doctors and patients and the Canadian flag", "a school with 6 classrooms, a
computer room, a sports court, students and teachers, and a playground",
"a massive pink mansion with wide doors and an elevator", "dig a 30 by 20
lake". Fixed blueprint cards cannot cover that, and a small on-device
language model copies its examples instead of adapting them. Buildings also
have to be places a character can actually use: doors on the ground, stairs
that arrive somewhere, rooms with doorways and light, nothing in the way.

## Decision

**The words are the spec.** `parseBuildRequest` (`engine/chat/buildRequest.ts`)
turns free text into a building spec: type (house, hospital, school, shop,
skyscraper, hotel, barn, library, restaurant, fire station, castle), size
words or "15 by 9", floors, material, colours, furnishing, rooms with
purposes and counts, outdoor features, doors (wide, tall, automatic, piston),
elevator, flag, and people. `parseEarthwork` does the same for digging: pool
(in-ground or above-ground), lake, pond, pit, bunker, tunnel, well, moat,
with sizes and depth. The rule provider builds directly from the spec. When a
language model answers, the chat agent still parses the child's words and,
if they describe a building or a dig, replaces the model's building call
with the parsed one; the model keeps its spoken line. Failed model actions
fall back to the rules. Every model, and no model, produces the same result.

**A generator, not blueprints.** `BuildTools.planHouse` and `planEarthwork`
produce edits for any combination of knobs (`HouseOptions`, `EarthworkOptions`,
filled from loose arguments by `buildingKit.ts`): foundation at ground level
with a real door, glass windows, a corridor with a lobby passage and rooms
furnished by purpose on big floors, a stairwell of zig-zag flights with
landings (or a ladder shaft when too narrow), lamps and lanterns, stepped or
flat roofs, castle towers, a hospital cross, a flag on a pole, piston doors
on one lever, an elevator shaft with a lift entity, and outdoor features
(court, playground, pool, garden, car park, fountain, fence). The same tools
serve the UI, the helper model, and outside agents (`build_house`,
`build_dig`).

**Features are generated too.** Bridges, treehouses, playgrounds, courts,
gardens, fountains, car parks, and fences are drawn by the same code whether
they stand beside a building or on their own (`build_feature`, any size, any
colour). A bridge gets a plank deck a block up, railings, log posts, and a
step at each end; a treehouse gets log stilts, a platform, a ladder through
the middle, a railing with a gap, and a roof. Both go through the livability
pass, so the deck is walkable end to end and the ladder reaches a clear
platform. The blueprint cards stay as stamp buttons in the UI; the words no
longer route to them.

**Livability rules, enforced and proven.** `engine/build/livability.ts`
fixes what it can (`ensureLivable`) and reports what it cannot
(`checkLivability`): doors on the ground, tall and wide enough, three deep
clear outside and clear behind, on firm ground; three blocks of clearance
over every step and landing (the character lifts its whole body a block to
climb); landings solid; ladders continuous with a clear exit; every room
with a doorway and a light. A fuzz test runs 160 building specs against the
checker. Physics tests then drive the real `PlayerController` up every
flight and ladder, in the front door and down the lobby to the corridor with
the power system opening the plate door, down into a bunker and out, along
a tunnel, and through a piston door. Rules describe intent; the physics
runs are the proof.

## Consequences

- New room purposes, features, flags, and building types are data: a regex
  and a defaults row.
- Any future change to walls, slabs, stairs, or furniture that traps the
  character fails a test rather than reaching a child.
- Blueprint cards remain for bridges, pools, gardens, and treehouses, and
  are checked for door height.

## Addendum (2026-09-07): somewhere to put it

Everything used to go up at one spot a few blocks in front of the child, so a
sentence asking for three things stacked them on top of each other. A
`SitePlanner` (`build/siteFinder.ts`) now hands out ground: it spirals outward
from where the child is standing and takes the first patch that is level
(no more than two blocks of rise across the whole plot), clear of anything
standing on it, inside loaded chunks, not already claimed, and — the part that
matters most in a town — still plain land. The terrain generator lays only
`category: 'ground'` blocks on the surface (grass, dirt, sand, gravel, stone,
snow, clay, moss, ice), so anything else underfoot is a road, a plaza, a sports
court or somebody's floor, and the planner keeps off it. That also means a
reloaded game, which remembers no claims at all, still reads the ground and
builds beside the old house rather than through it. Every plot it
gives out is remembered for the session, so the next request goes next door
rather than on top. Buildings, digs, features and plain shapes all ask for their
own plot, sized to what they are; when the world really has nowhere to put it
(all hills, all houses) the child still gets their building, right where they
stand.
