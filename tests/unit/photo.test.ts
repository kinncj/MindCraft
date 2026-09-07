import { describe, expect, it } from 'vitest';
import { photoFileName } from '../../src/game/photo';

describe('photos', () => {
  it('names the file after the world and the moment, and copes with any name a kid types', () => {
    const at = new Date('2026-09-07T14:05:09.000Z');
    expect(photoFileName('Rainbow Island!', at)).toMatch(/^mindcraft-photo-rainbow-island-2026-09-07-\d{6}\.png$/);
    expect(photoFileName('💜💜💜', at)).toMatch(/^mindcraft-photo-2026-09-07-\d{6}\.png$/);
    expect(photoFileName('a'.repeat(80), at).length).toBeLessThan(80);
  });
});
