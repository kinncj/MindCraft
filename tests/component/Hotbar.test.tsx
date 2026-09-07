import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockPalette } from '../../src/components/BlockPalette';
import { Hotbar } from '../../src/components/Hotbar';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

describe('Hotbar', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('renders nine slots plus a More button, with the first selected', () => {
    render(<Hotbar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Grass, selected' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Magic Delivery Box')).toBeInTheDocument();
  });

  it('selects a slot on click and with number keys, returning to place mode', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ mode: 'remove' });
    render(<Hotbar />);
    await user.click(screen.getByRole('button', { name: 'Brick' }));
    expect(useGameStore.getState().selectedBlockType).toBe('brick');
    expect(useGameStore.getState().mode).toBe('place');
    fireEvent.keyDown(window, { key: '7' });
    expect(useGameStore.getState().selectedBlockType).toBe('torch');
  });

  it('opens the palette and fills the selected slot from it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Hotbar />
        <BlockPalette />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Brick' }));
    await user.click(screen.getByRole('button', { name: 'More blocks' }));
    expect(screen.getByRole('dialog', { name: 'All blocks' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Wood Stairs' }));
    expect(useGameStore.getState().hotbar[2]).toBe('planks_stairs');
    expect(useGameStore.getState().selectedBlockType).toBe('planks_stairs');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
