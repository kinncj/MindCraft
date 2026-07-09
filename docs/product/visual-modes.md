# Visual modes

MindCraft ships three visual modes, switchable in the menu. The selected mode is saved in
the browser and travels with exported worlds.

## Classic

The default. Bright blue sky, clean colors, chunky pixels, soft shadows. Built to be
instantly readable for a six-year-old and fast on any machine.

## Ultra

The "realistic-inspired" mode: deeper sky palette, stronger sun, ACES filmic tone
mapping, longer fog draw distance, and the same soft shadows. It makes the world feel
more cinematic without heavy post-processing — a deliberate MVP trade-off. True
ultra-realism (SSAO, bloom chains) was skipped: it costs frame rate on laptops and adds
nothing a kid notices. Documented limitation, revisit if hardware headroom shows up.

## Claude Dream

A magical world imagined by code: lavender-pink sky palette, floating pastel sparkles
that drift and pulse, softer sunlight, dreamier fog. Never scary — even Dream-mode night
is a cozy violet.

## How modes interact with the day/night cycle

A mode defines a **sky palette** (day, dawn, night colors), lighting intensities, tone
mapping, fog range, and effect flags. The day/night cycle blends within the palette of
whatever mode is active, so "Claude Dream at dusk" and "Ultra at noon" both look
intentional. Weather (rain/snow) desaturates the sky and dims sunlight on top of that.

## Where this lives

`src/shaders/visualModes.ts` holds the mode definitions (pure data), and
`src/game/engine/environment.ts` applies them. See
`docs/architecture/adr-0005-visual-mode-and-shader-package.md` for the design reasoning.
