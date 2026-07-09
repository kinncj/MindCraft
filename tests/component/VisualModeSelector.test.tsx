import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisualModeSelector } from '../../src/components/VisualModeSelector';
import { WorldSettings } from '../../src/components/WorldSettings';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

describe('VisualModeSelector', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('renders the three modes with classic selected by default', () => {
    render(<VisualModeSelector />);
    expect(screen.getByRole('button', { name: /Classic/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Ultra/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Claude Dream/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('selects each mode', async () => {
    const user = userEvent.setup();
    render(<VisualModeSelector />);
    await user.click(screen.getByRole('button', { name: /Ultra/ }));
    expect(useGameStore.getState().visualMode).toBe('ultraRealistic');
    await user.click(screen.getByRole('button', { name: /Claude Dream/ }));
    expect(useGameStore.getState().visualMode).toBe('claudeDream');
    await user.click(screen.getByRole('button', { name: /Classic/ }));
    expect(useGameStore.getState().visualMode).toBe('classic');
  });
});

describe('WorldSettings', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('switches time of day and weather', async () => {
    const user = userEvent.setup();
    render(<WorldSettings />);
    await user.click(screen.getByRole('button', { name: /Always night/ }));
    expect(useGameStore.getState().timeMode).toBe('night');
    await user.click(screen.getByRole('button', { name: /Rain/ }));
    expect(useGameStore.getState().weather).toBe('rain');
    await user.click(screen.getByRole('button', { name: /Snowfall/ }));
    expect(useGameStore.getState().weather).toBe('snow');
  });
});
