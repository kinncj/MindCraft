import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MagicDeliveryBoxPanel } from '../../src/components/MagicDeliveryBoxPanel';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

function seedOpenBox(items: Array<{ blockType: 'star' | 'rainbow'; quantity: number }> = []) {
  useGameStore.setState({
    boxes: [
      { id: 'box-1', name: 'Magic Delivery Box', position: { x: 5, y: 1, z: 5 }, items },
    ],
    openPanel: 'magic-box',
    activeBoxId: 'box-1',
  });
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

  it('stores the selected block in the box', async () => {
    const user = userEvent.setup();
    seedOpenBox();
    useGameStore.setState({ selectedBlockType: 'star' });
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: /Put a Star block inside/ }));
    expect(useGameStore.getState().boxes[0].items).toEqual([
      { blockType: 'star', quantity: 1 },
    ]);
    expect(screen.getByText('Star × 1')).toBeInTheDocument();
  });

  it('takes an item out and selects that block', async () => {
    const user = userEvent.setup();
    seedOpenBox([{ blockType: 'rainbow', quantity: 2 }]);
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: 'Take one out' }));
    const state = useGameStore.getState();
    expect(state.boxes[0].items).toEqual([{ blockType: 'rainbow', quantity: 1 }]);
    expect(state.selectedBlockType).toBe('rainbow');
  });

  it('empties the box only after confirmation', async () => {
    const user = userEvent.setup();
    seedOpenBox([{ blockType: 'star', quantity: 3 }]);
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: /Empty the box/ }));
    // Still there until confirmed.
    expect(useGameStore.getState().boxes[0].items).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Yes, empty it' }));
    expect(useGameStore.getState().boxes[0].items).toHaveLength(0);
  });

  it('renames the box', async () => {
    const user = userEvent.setup();
    seedOpenBox();
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: /Rename box/ }));
    const input = screen.getByLabelText('New name for your box');
    await user.clear(input);
    await user.type(input, 'Treasure Box');
    await user.click(screen.getByRole('button', { name: 'Save box name' }));
    expect(useGameStore.getState().boxes[0].name).toBe('Treasure Box');
  });

  it('closes with the close button', async () => {
    const user = userEvent.setup();
    seedOpenBox();
    render(<MagicDeliveryBoxPanel />);
    await user.click(screen.getByRole('button', { name: 'Close the box' }));
    expect(useGameStore.getState().openPanel).toBe('none');
  });
});
