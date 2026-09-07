import { describe, expect, it } from 'vitest';
import { AudioSystem } from '../../src/engine/audio/AudioSystem';
import { MelodyWalker, midiToNote, moodFor, noteBlockPitch, noteToMidi, volumeToDb } from '../../src/engine/audio/music';

describe('music helpers', () => {
  it('converts notes and midi both ways', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A3')).toBe(57);
    expect(midiToNote(61)).toBe('C#4');
    expect(midiToNote(noteToMidi('G#5'))).toBe('G#5');
    expect(noteBlockPitch(0)).toBe('C4');
    expect(noteBlockPitch(11)).toBe('B4');
    expect(noteBlockPitch(12)).toBe('C4');
  });

  it('picks a cozy slow mood at night and biome moods by day', () => {
    expect(moodFor('meadow', 0.8).name).toBe('night');
    expect(moodFor('meadow', 0.8).bpm).toBeLessThan(moodFor('meadow', 0.3).bpm);
    expect(moodFor('desert', 0.3).name).toBe('desert');
    expect(moodFor('cherry', 0.3).name).toBe('forest');
    expect(moodFor('ocean', 0.3).name).toBe('seaside');
    expect(moodFor('flat', 0.3).name).toBe('meadow');
  });

  it('walks a melody inside the scale, deterministically per seed', () => {
    const mood = moodFor('meadow', 0.3);
    const a = new MelodyWalker(3);
    const b = new MelodyWalker(3);
    const notesA = Array.from({ length: 40 }, () => a.next(mood));
    const notesB = Array.from({ length: 40 }, () => b.next(mood));
    expect(notesA).toEqual(notesB);
    const played = notesA.filter((n): n is string => n !== null);
    expect(played.length).toBeGreaterThan(10);
    for (const note of played) {
      const rel = ((noteToMidi(note) - noteToMidi(mood.root)) % 12 + 12) % 12;
      expect(mood.scale).toContain(rel);
    }
    expect(a.chord(mood, 0)).toHaveLength(3);
  });

  it('maps volume to a sane dB range', () => {
    expect(volumeToDb(0)).toBe(-60);
    expect(volumeToDb(1)).toBe(0);
    expect(volumeToDb(0.5)).toBe(-15);
  });
});

describe('audio system without an audio context', () => {
  it('records plays, keeps settings, and stays silent before start', () => {
    const audio = new AudioSystem();
    expect(audio.ready).toBe(false);
    audio.play('place');
    audio.playNote(3);
    audio.step(1, false);
    audio.step(1.1, false); // throttled
    expect(audio.played).toEqual(['place', 'pop', 'step']);
    audio.setSettings({ muted: true, volume: 0.2 });
    expect(audio.settings).toEqual({ muted: true, music: true, volume: 0.2 });
    audio.setMood('desert', 0.3);
    audio.update();
    audio.dispose();
  });
});
