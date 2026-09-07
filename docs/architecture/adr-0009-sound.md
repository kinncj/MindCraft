# ADR-0009: Sound generated in code with Tone.js

**Status:** accepted

## Context

The game ships no assets and makes no network requests. Sound had to follow the
same rule, and a six-year-old's game must never blare.

## Decision

- `src/engine/audio/AudioSystem.ts` owns all sound through **Tone.js**, loaded
  lazily (`import('tone')`) on the first user gesture so nothing plays or downloads
  before the kid taps. Without an audio context (tests, locked-down browsers) it
  records what it would have played and stays silent.
- Music is generative: `music.ts` holds pure, tested helpers — moods per biome and
  time of day (root, pentatonic scale, tempo, density, loudness), a seeded melody
  walker, and simple chords. A `Tone.Loop` on eighth notes plays a sine melody over
  a triangle pad through one reverb. Night is slower and softer.
- Effects are short synth gestures (place, remove, footsteps alternating left/right,
  jump, splash, door, switch, pop, happy arpeggio, crafting sparkle, piston, vroom).
  Note blocks play one octave from C4 by state variant.
- Settings (mute, music, volume) live in `localStorage` (global, not per world) and
  are exposed through `audio_set` / `audio_play` tools.

## Consequences

- Tone.js is its own vendor chunk; the main bundle does not grow.
- Music follows the player's biome with a two-second poll, cross-fading tempo.
- Any future instrument or jingle is a few lines of synthesis, not a file.
