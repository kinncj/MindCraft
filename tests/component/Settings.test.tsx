import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisualModeSelector } from '../../src/components/VisualModeSelector';
import { WorldSettings } from '../../src/components/WorldSettings';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

describe('settings', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('renders the three visual modes and selects each', async () => {
    const user = userEvent.setup();
    render(<VisualModeSelector />);
    expect(screen.getByRole('button', { name: /Classic/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Ultra/ }));
    expect(useGameStore.getState().visualMode).toBe('ultraRealistic');
    await user.click(screen.getByRole('button', { name: /Claude Dream/ }));
    expect(useGameStore.getState().visualMode).toBe('claudeDream');
  });

  it('switches time of day and weather', async () => {
    const user = userEvent.setup();
    render(<WorldSettings />);
    await user.click(screen.getByRole('button', { name: /Always night/ }));
    expect(useGameStore.getState().timeMode).toBe('night');
    await user.click(screen.getByRole('button', { name: /Snowfall/ }));
    expect(useGameStore.getState().weather).toBe('snow');
  });
});
