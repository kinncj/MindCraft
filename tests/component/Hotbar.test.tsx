import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hotbar } from '../../src/components/Hotbar';
import { HOTBAR_BLOCK_TYPES, BLOCK_DEFINITIONS } from '../../src/game/engine/blockRegistry';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

describe('Hotbar', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('renders every hotbar block, including the Magic Delivery Box', () => {
    render(<Hotbar />);
    for (const type of HOTBAR_BLOCK_TYPES) {
      const def = BLOCK_DEFINITIONS[type];
      expect(screen.getByText(def.label)).toBeInTheDocument();
    }
    expect(screen.getByText('Magic Delivery Box')).toBeInTheDocument();
  });

  it('marks the selected block', () => {
    render(<Hotbar />);
    const grass = screen.getByRole('button', { name: /Grass, selected/ });
    expect(grass).toHaveAttribute('aria-pressed', 'true');
  });

  it('selects a block on click', async () => {
    const user = userEvent.setup();
    render(<Hotbar />);
    await user.click(screen.getByRole('button', { name: 'Star' }));
    expect(useGameStore.getState().selectedBlockType).toBe('star');
  });

  it('selects blocks with number keys', () => {
    render(<Hotbar />);
    fireEvent.keyDown(window, { key: '3' });
    expect(useGameStore.getState().selectedBlockType).toBe(HOTBAR_BLOCK_TYPES[2]);
  });

  it('switches back to place mode when picking a block', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ mode: 'remove' });
    render(<Hotbar />);
    await user.click(screen.getByRole('button', { name: 'Brick' }));
    expect(useGameStore.getState().mode).toBe('place');
  });
});
