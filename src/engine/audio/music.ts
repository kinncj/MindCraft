/**
 * Pure music helpers: scales, moods, and a seeded melody walker. No
 * Tone.js here so the logic is unit-testable and the engine can decide
 * what to play before the audio context exists.
 */

export type Mood = {
  /** Root note name, e.g. "C4". */
  root: string;
  /** Semitone offsets of the scale. */
  scale: number[];
  bpm: number;
  /** 0..1 how busy the melody is. */
  density: number;
  /** Pad and melody loudness in dB. */
  volume: number;
  name: string;
};

const MAJOR_PENTA = [0, 2, 4, 7, 9];
const MINOR_PENTA = [0, 3, 5, 7, 10];

/** What the world sounds like for a biome at a time of day (0..1). */
export function moodFor(biome: string, timeOfDay: number): Mood {
  const night = timeOfDay > 0.55 || timeOfDay < 0.05;
  if (night) return { name: 'night', root: 'A3', scale: MINOR_PENTA, bpm: 64, density: 0.35, volume: -22 };
  switch (biome) {
    case 'desert':
      return { name: 'desert', root: 'D4', scale: MINOR_PENTA, bpm: 88, density: 0.5, volume: -18 };
    case 'snowy':
      return { name: 'snowy', root: 'F4', scale: MAJOR_PENTA, bpm: 72, density: 0.4, volume: -20 };
    case 'forest':
    case 'cherry':
      return { name: 'forest', root: 'G4', scale: MAJOR_PENTA, bpm: 96, density: 0.6, volume: -18 };
    case 'ocean':
    case 'beach':
      return { name: 'seaside', root: 'C4', scale: MAJOR_PENTA, bpm: 80, density: 0.45, volume: -19 };
    case 'hills':
      return { name: 'hills', root: 'E4', scale: MAJOR_PENTA, bpm: 84, density: 0.5, volume: -19 };
    default:
      return { name: 'meadow', root: 'C4', scale: MAJOR_PENTA, bpm: 100, density: 0.6, volume: -18 };
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteToMidi(note: string): number {
  const match = /^([A-G])(#?)(-?\d)$/.exec(note);
  if (!match) return 60;
  const index = NOTE_NAMES.indexOf(match[1] + match[2]);
  return (Number(match[3]) + 1) * 12 + index;
}

export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

/** A gentle random walk over a scale: mostly steps, sometimes a leap. */
export class MelodyWalker {
  private degree = 0;
  private octave = 0;
  private seed: number;

  constructor(seed = 1) {
    this.seed = seed >>> 0 || 1;
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2 ** 32;
  }

  /** Next note name for a mood, or null for a rest. */
  next(mood: Mood): string | null {
    if (this.rand() > mood.density) return null;
    const r = this.rand();
    const step = r < 0.55 ? 1 : r < 0.8 ? -1 : r < 0.9 ? 2 : -2;
    this.degree += step;
    while (this.degree >= mood.scale.length) {
      this.degree -= mood.scale.length;
      this.octave += 1;
    }
    while (this.degree < 0) {
      this.degree += mood.scale.length;
      this.octave -= 1;
    }
    this.octave = Math.max(-1, Math.min(1, this.octave));
    const midi = noteToMidi(mood.root) + mood.scale[this.degree] + this.octave * 12;
    return midiToNote(midi);
  }

  /** A three-note chord on the root or the fifth. */
  chord(mood: Mood, bar: number): string[] {
    const base = noteToMidi(mood.root) - 12 + (bar % 4 === 2 ? 7 : bar % 4 === 3 ? 5 : 0);
    const third = mood.scale.includes(3) ? 3 : 4;
    return [midiToNote(base), midiToNote(base + third), midiToNote(base + 7)];
  }
}

/** Note block pitch (0..11) → note name, one octave from C4. */
export function noteBlockPitch(pitch: number): string {
  return midiToNote(60 + ((pitch % 12) + 12) % 12);
}

export type SoundName =
  | 'place'
  | 'remove'
  | 'step'
  | 'jump'
  | 'splash'
  | 'door'
  | 'click'
  | 'pop'
  | 'happy'
  | 'craft'
  | 'switch'
  | 'piston'
  | 'vroom'
  | 'gift'
  | 'sizzle';

export type AudioSettings = { muted: boolean; music: boolean; volume: number };

export const DEFAULT_AUDIO: AudioSettings = { muted: false, music: true, volume: 0.7 };

/** Loudness as dB for the master, from a 0..1 slider (never above 0). */
export function volumeToDb(volume: number): number {
  const v = Math.max(0, Math.min(1, volume));
  return v <= 0 ? -60 : -30 + 30 * v;
}
