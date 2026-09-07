import { describe, expect, it } from 'vitest';
import { GameLoop } from '../../src/engine/core/GameLoop';

describe('the game loop survives a broken system', () => {
  it('skips the throwing system for that frame, reports it once, and keeps the others running', () => {
    const loop = new GameLoop();
    const reports: string[] = [];
    loop.onError = (system, error) => reports.push(`${system}: ${error instanceof Error ? error.message : String(error)}`);
    let good = 0;
    loop.add({ name: 'bad', update: () => { throw new Error('boom'); } });
    loop.add({ name: 'good', update: () => { good += 1; } });
    for (let i = 0; i < 10; i++) loop.step(1 / 60);
    expect(good).toBe(10);
    expect(loop.errors).toBe(10);
    expect(reports).toEqual(['bad: boom']); // the same message is not spammed
  });
});
