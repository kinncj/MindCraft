import { describe, expect, it } from 'vitest';
import { blocks } from '../../src/engine/blocks/blocks';

describe('see-through vs light-transparent', () => {
  it('glass and water are see-through; slabs pass light but are not see-through', () => {
    expect(blocks.byId('glass')?.seeThrough).toBe(true);
    expect(blocks.byId('water')?.seeThrough).toBe(true);
    expect(blocks.byId('glass_pane')?.seeThrough).toBe(true);
    expect(blocks.byId('planks_slab')?.seeThrough).toBe(false);
    expect(blocks.byId('planks_slab')?.transparent).toBe(true);
    expect(blocks.byId('stone')?.seeThrough).toBe(false);
  });
});
