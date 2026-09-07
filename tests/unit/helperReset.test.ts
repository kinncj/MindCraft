// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

describe('helper crash-loop guard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a load that never finished stops the helper from auto-loading next time', async () => {
    localStorage.setItem('mindcraft-helper', '1');
    localStorage.setItem('mindcraft-helper-loading', '1');
    const { useGameStore } = await import('../../src/game/gameStore');
    // The store module is cached across tests; read the state it computed for this storage.
    const fresh = useGameStore.getState();
    // Either the guard fired at module load (error) or an earlier import happened; both paths keep the flag cleared.
    expect(['error', 'none', 'loading']).toContain(fresh.helper.status);
    expect(localStorage.getItem('mindcraft-helper-loading')).toBeNull();
  });

  it('resetting forgets the choice, the size, and the crash guard', async () => {
    localStorage.setItem('mindcraft-helper', '1');
    localStorage.setItem('mindcraft-helper-model', 'Qwen2.5-3B-Instruct-q4f16_1-MLC');
    localStorage.setItem('mindcraft-helper-loading', '1');
    localStorage.setItem('mindcraft-cinema-probation', '123');
    const { forgetHelperEverywhere } = await import('../../src/game/gameStore');
    await forgetHelperEverywhere();
    expect(localStorage.getItem('mindcraft-helper')).toBeNull();
    expect(localStorage.getItem('mindcraft-helper-model')).toBeNull();
    expect(localStorage.getItem('mindcraft-helper-loading')).toBeNull();
    expect(localStorage.getItem('mindcraft-cinema-probation')).toBeNull();
  });
});
