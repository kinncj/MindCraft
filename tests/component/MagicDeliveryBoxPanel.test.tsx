import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { B } from '../../src/engine/blocks/blocks';
import { MagicDeliveryBoxPanel } from '../../src/components/MagicDeliveryBoxPanel';
import { useGameStore } from '../../src/game/gameStore';
import { installFakeEngine, resetGameStore } from './helpers';

const POS = { x: 5, y: 1, z: 5 };

function seedOpenBox(items: Array<{ blockType: string; quantity: number }> = []) {
  const { world } = installFakeEngine();
  world.setBlock(POS.x, POS.y, POS.z, B.magic_box);
  world.setEntity(POS.x, POS.y, POS.z, { kind: 'container', data: { name: 'Magic Delivery Box', items } });
  useGameStore.setState({ openPanel: 'container', panelPayload: { position: POS } });
  return world;
}

describe('MagicDeliveryBoxPanel', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('is hidden until a box is opened', () => {
    render(<MagicDeliveryBoxPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and shows the empty message', () => {
    seedOpenBox();
    render(<MagicDeliveryBoxPanel />);
    expect(screen.getByRole('dialog', { name: 'Magic Delivery Box' })).toBeInTheDocument();
    expect(screen.getByText('Your box is empty')).toBeInTheDocument();
  });

  it('stores the selected block in the box (inside the world)', async () => {
    const user = userEvent.setup();
    const world = seedOpenBox();
    useGameStore.setState({ selectedBlockType: 'star' });
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: /Put a Star block inside/ }));
    expect(world.getEntity(POS.x, POS.y, POS.z)?.data.items).toEqual([{ blockType: 'star', quantity: 1 }]);
    expect(screen.getByText('Star × 1')).toBeInTheDocument();
  });

  it('takes an item out and selects that block', async () => {
    const user = userEvent.setup();
    const world = seedOpenBox([{ blockType: 'rainbow', quantity: 2 }]);
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: 'Take one out' }));
    expect(world.getEntity(POS.x, POS.y, POS.z)?.data.items).toEqual([{ blockType: 'rainbow', quantity: 1 }]);
    expect(useGameStore.getState().selectedBlockType).toBe('rainbow');
  });

  it('empties the box only after confirmation, and renames it', async () => {
    const user = userEvent.setup();
    const world = seedOpenBox([{ blockType: 'star', quantity: 3 }]);
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: /Empty the box/ }));
    expect((world.getEntity(POS.x, POS.y, POS.z)?.data.items as unknown[]).length).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Yes, empty it' }));
    expect(world.getEntity(POS.x, POS.y, POS.z)?.data.items).toEqual([]);
    await user.click(screen.getByRole('button', { name: /Rename box/ }));
    const input = screen.getByLabelText('New name for your box');
    await user.clear(input);
    await user.type(input, 'Treasure Box');
    await user.click(screen.getByRole('button', { name: 'Save box name' }));
    expect(world.getEntity(POS.x, POS.y, POS.z)?.data.name).toBe('Treasure Box');
    await user.click(screen.getByRole('button', { name: /^Close / }));
    expect(useGameStore.getState().openPanel).toBe('none');
  });
});
