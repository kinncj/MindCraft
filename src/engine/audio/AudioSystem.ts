import type { System } from '../core/System';
import { DEFAULT_AUDIO, MelodyWalker, moodFor, noteBlockPitch, volumeToDb, type AudioSettings, type Mood, type SoundName } from './music';

type ToneModule = typeof import('tone');

/**
 * All sound, generated in code with Tone.js: a soft generative
 * soundtrack that follows biome and time of day, and small effects for
 * building and friends. Tone.js is loaded on the first user gesture, so
 * nothing plays (or downloads) before the kid taps.
 */
export class AudioSystem implements System {
  readonly name = 'audio';
  settings: AudioSettings = { ...DEFAULT_AUDIO };
  private tone: ToneModule | null = null;
  private starting: Promise<void> | null = null;
  private master: import('tone').Volume | null = null;
  private sfx: import('tone').PolySynth | null = null;
  private noise: import('tone').NoiseSynth | null = null;
  private melody: import('tone').PolySynth | null = null;
  private pad: import('tone').PolySynth | null = null;
  private loop: import('tone').Loop | null = null;
  private musicGain: import('tone').Volume | null = null;
  private walker = new MelodyWalker(7);
  private mood: Mood = moodFor('meadow', 0.3);
  private targetMood: Mood = this.mood;
  private beat = 0;
  private lastStep = 0;
  private stepSide = 0;
  /** Names of sounds played, for tests and the debug hook. */
  readonly played: SoundName[] = [];

  get ready(): boolean {
    return this.tone !== null;
  }

  /** Call from a user gesture. Safe to call many times. */
  start(): Promise<void> {
    if (this.tone) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = (async () => {
      try {
        const tone = await import('tone');
        await tone.start();
        this.build(tone);
        this.tone = tone;
        this.applySettings();
      } catch {
        // No audio context (tests, locked-down browsers): stay silent.
      }
    })();
    return this.starting;
  }

  private build(T: ToneModule): void {
    this.master = new T.Volume(volumeToDb(this.settings.volume)).toDestination();
    const reverb = new T.Reverb({ decay: 2.4, wet: 0.25 }).connect(this.master);
    this.sfx = new T.PolySynth(T.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0.1, release: 0.2 } }).connect(reverb);
    this.sfx.volume.value = -10;
    this.noise = new T.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 } }).connect(this.master);
    this.noise.volume.value = -18;
    this.musicGain = new T.Volume(-6).connect(reverb);
    this.melody = new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.8 } }).connect(this.musicGain);
    this.pad = new T.PolySynth(T.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 1.2, decay: 0.5, sustain: 0.6, release: 2.5 } }).connect(this.musicGain);
    this.pad.volume.value = -12;
    this.loop = new T.Loop((time) => this.tickMusic(time), '8n');
    T.getTransport().bpm.value = this.mood.bpm;
    this.loop.start(0);
    if (this.settings.music && !this.settings.muted) T.getTransport().start();
  }

  private tickMusic(time: number): void {
    if (!this.melody || !this.pad || !this.tone) return;
    if (this.mood.name !== this.targetMood.name) {
      this.mood = this.targetMood;
      this.tone.getTransport().bpm.rampTo(this.mood.bpm, 4);
      if (this.musicGain) this.musicGain.volume.rampTo(this.mood.volume + 12, 2);
    }
    if (this.beat % 8 === 0) this.pad.triggerAttackRelease(this.walker.chord(this.mood, this.beat / 8), '2n', time);
    const note = this.walker.next(this.mood);
    if (note) this.melody.triggerAttackRelease(note, '8n', time, 0.5);
    this.beat += 1;
  }

  /** The world tells the music where the player is. */
  setMood(biome: string, timeOfDay: number): void {
    this.targetMood = moodFor(biome, timeOfDay);
  }

  update(): void {
    // Nothing per frame: Tone's transport schedules the music.
  }

  setSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.applySettings();
  }

  private applySettings(): void {
    if (!this.tone || !this.master) return;
    this.master.volume.value = volumeToDb(this.settings.muted ? 0 : this.settings.volume);
    this.master.mute = this.settings.muted;
    const transport = this.tone.getTransport();
    if (this.settings.music && !this.settings.muted) {
      if (transport.state !== 'started') transport.start();
    } else if (transport.state === 'started') transport.pause();
  }

  /** Footsteps, throttled and alternating left/right. */
  step(elapsed: number, inWater: boolean): void {
    if (elapsed - this.lastStep < 0.34) return;
    this.lastStep = elapsed;
    this.stepSide = 1 - this.stepSide;
    this.play(inWater ? 'splash' : 'step', this.stepSide ? 0 : -3);
  }

  /** Plays a named effect; `detune` in semitones shifts the pitch. */
  play(sound: SoundName, detune = 0): void {
    this.played.push(sound);
    if (this.played.length > 50) this.played.shift();
    if (!this.tone || !this.sfx || !this.noise || this.settings.muted) return;
    const T = this.tone;
    const now = T.now();
    const n = (midi: number): string => T.Frequency(midi + detune, 'midi').toNote();
    switch (sound) {
      case 'place':
        this.sfx.triggerAttackRelease(n(72), '16n', now, 0.6);
        break;
      case 'remove':
        this.noise.triggerAttackRelease('16n', now);
        this.sfx.triggerAttackRelease(n(55), '16n', now + 0.02, 0.4);
        break;
      case 'step':
        this.noise.triggerAttackRelease('32n', now, 0.35);
        break;
      case 'jump':
        this.sfx.triggerAttackRelease(n(67), '32n', now, 0.4);
        this.sfx.triggerAttackRelease(n(74), '32n', now + 0.07, 0.4);
        break;
      case 'splash':
        this.noise.triggerAttackRelease('8n', now, 0.6);
        this.sfx.triggerAttackRelease(n(64), '16n', now + 0.05, 0.3);
        break;
      case 'door':
        this.sfx.triggerAttackRelease(n(52), '8n', now, 0.5);
        this.sfx.triggerAttackRelease(n(59), '8n', now + 0.12, 0.4);
        break;
      case 'click':
      case 'switch':
        this.sfx.triggerAttackRelease(n(84), '32n', now, 0.5);
        break;
      case 'pop':
        this.sfx.triggerAttackRelease(n(79), '32n', now, 0.4);
        break;
      case 'happy':
        for (const [i, midi] of [72, 76, 79, 84].entries()) this.sfx.triggerAttackRelease(n(midi), '16n', now + i * 0.07, 0.5);
        break;
      case 'craft':
      case 'gift':
        for (const [i, midi] of [60, 64, 67, 72, 76, 79].entries()) this.sfx.triggerAttackRelease(n(midi), '16n', now + i * 0.06, 0.5);
        break;
      case 'piston':
        this.noise.triggerAttackRelease('16n', now, 0.7);
        this.sfx.triggerAttackRelease(n(48), '16n', now, 0.5);
        break;
      case 'vroom':
        this.sfx.triggerAttackRelease(n(45), '8n', now, 0.5);
        this.sfx.triggerAttackRelease(n(52), '8n', now + 0.1, 0.5);
        break;
      case 'sizzle':
        this.noise.triggerAttackRelease('4n', now, 0.5);
        break;
    }
  }

  /** A note block: pitch 0..11 over one octave. */
  playNote(pitch: number): void {
    this.played.push('pop');
    if (!this.tone || !this.sfx || this.settings.muted) return;
    this.sfx.triggerAttackRelease(noteBlockPitch(pitch), '8n', this.tone.now(), 0.7);
  }

  dispose(): void {
    this.loop?.dispose();
    this.melody?.dispose();
    this.pad?.dispose();
    this.sfx?.dispose();
    this.noise?.dispose();
    this.musicGain?.dispose();
    this.master?.dispose();
    if (this.tone) {
      const transport = this.tone.getTransport();
      transport.stop();
      transport.cancel();
    }
    this.tone = null;
  }
}
