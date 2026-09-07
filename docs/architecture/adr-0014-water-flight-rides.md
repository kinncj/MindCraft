# ADR-0014: Flowing water, creative flight, and rides with real-feel physics

Status: accepted (2026-09-07)

## Context

Water used to be a static block. Kids expect the real thing: pour a
bucket on a hill and watch it stream downhill, dig a channel from a pond
and have it fill. They also expect to fly in creative mode, and asked for
an airplane, a helicopter, a motorbike, and a car that feels like a car.
All of it must stay kid-safe (no crashes, no drowning, no getting stuck)
and work with keyboard, touch, and gamepad.

## Decision

**Fluid state.** A water block's state variant holds its level: 0 is a
source, 1..7 flowing (1 strongest), 8 falling. The `fluid` shape draws a
box as tall as the level (`fluidHeight`), and Cinema's smooth water uses
the same heights as densities, so streams slope.

**FluidSystem** (`engine/world/FluidSystem.ts`) runs five times a second
over *woken* cells only: any block change wakes the cell and its fluid
neighbors, so lakes stay still until something changes next to them.
A cell pours straight down when it can (falling), otherwise spreads to
its four sides one level weaker, up to seven blocks. Flowing water that
loses its feed drains, so undoing the source empties the stream. Water
between two sources on firm ground becomes a source (a pond never runs
dry). Simulation writes bypass the command history, like the logic
system: the kid's *source* is the undoable edit.

Water is `replaceable`, and taps look through it except in Remove mode,
so a hole can be plugged and a spill mopped up. Currents push the player
(`FluidSystem.current`), and creatures swim: they float with their body
in the water and move at half speed.

**Flight.** Two Jump presses within 0.32 s, from any input source, emit a
`fly_toggle` command; the HUD has a wing button and `player_fly` is a
tool. Flying has no gravity: Jump rises, Sneak sinks, sprint doubles the
speed, and touching down while sinking ends the flight.

**Rides** (`engine/entities/vehicles.ts`). One `Vehicle` class with
per-kind tuning. Cars and motorbikes accelerate, brake before reversing,
coast with drag, and steer tighter when slow; bikes lean into corners.
Planes have a throttle: below takeoff speed they taxi like a car; above
it, Jump and Sneak pitch, left and right bank (banking turns), lift
scales with airspeed, and an idle engine sinks like a glider.
Helicopters lift straight up with Jump, hover, push along their heading
with forward and back, and yaw with left and right. Bumping a block just
stops the ride (never a crash), and nothing goes below the ground. Space
hops off ground rides; aircraft use Jump to climb, so they hop off with
E or a tap. Three new card blocks (numeric ids 116..118) spawn the new
rides; saves store the kind as the entity variant.

## Consequences

- Old saves keep loading: existing water blocks have variant 0 (source)
  and only start flowing when something changes beside them.
- Flood risk is real, as in the games kids know: undo removes the source
  and the stream drains itself.
- The simulation is capped per tick (3000 cells) so a huge spill spreads
  over a few seconds instead of freezing a frame.
