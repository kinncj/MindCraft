# ADR-0008: Logic layer, crafting, and robots

**Status:** accepted

## Context

The kid wants things that *do* something: doors that open when you step on a
plate, lamps on switches, pistons that push, and a robot that builds. A creative
game also benefits from a gentle "this is made of that" crafting book.

## Decision

- **Logic** is a `LogicSystem` ticking ten times a second over the logic blocks in
  loaded chunks (tracked from chunk scans and block changes, never a world scan).
  Sources (lever on, button timer, pressed plate) seed a breadth-first flood through
  wires at −1 per block (max 15); any logic block adjacent to power is powered.
  Consumers get `onPowerChanged` only when their state flips. Pistons move blocks with
  direct world writes (automation must not fill the undo stack); undo still covers
  what the player placed.
- Blocks declare `logic: { role, kind }` and `immovable`; textures switch by state
  variant (lit wire), light by block swap (lamp → lamp_on).
- **Crafting** is data (`recipes.ts`): shaped recipes normalized to their bounding
  box, shapeless recipes compared as multisets. Crafting never consumes anything;
  the result goes to the hotbar with sparkles.
- **Robots** are entities with a `RobotRunner`: a card program (one nested repeat),
  flattened and stepped every 0.45 s, moving one block at a time and flying so a kid
  can follow every step. Programs persist in the entity data and are set from the
  panel or `robot_program`.

## Consequences

- Logic cost scales with logic blocks, not world size.
- The note block emits a `note` event; the audio phase turns it into a tone.
- All three are reachable through tools (`crafting_*`, `logic_*`, `robot_*`), so
  an agent can wire a house or program a robot the same way the panels do.
