import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuPanel } from '../../src/components/MenuPanel';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

describe('Worlds page', () => {
  beforeEach(() => {
    resetGameStore();
    useGameStore.setState({ storageAvailable: false, ready: true, openPanel: 'worlds' });
  });

  it('creates a meadow and a Toy Land, opens between them, and deletes with confirmation', async () => {
    const user = userEvent.setup();
    render(<MenuPanel />);
    await user.type(screen.getByLabelText('Make a new world'), 'Castle');
    await user.click(screen.getByRole('button', { name: '🌱 New meadow' }));
    await waitFor(() => expect(useGameStore.getState().worldName).toBe('Castle'));
    // The store closes panels when a world opens; reopen for the test.
    act(() => useGameStore.setState({ openPanel: 'worlds' }));
    await user.click(screen.getByRole('button', { name: '🧸 New Toy Land' }));
    await waitFor(() => expect(useGameStore.getState().worldName).toBe('Toy Land'));
    act(() => useGameStore.setState({ openPanel: 'worlds' }));
    expect(useGameStore.getState().worlds).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Open Castle' }));
    await waitFor(() => expect(useGameStore.getState().worldName).toBe('Castle'));
    act(() => useGameStore.setState({ openPanel: 'worlds' }));

    await user.click(screen.getByRole('button', { name: 'Delete Toy Land' }));
    expect(useGameStore.getState().worlds).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Yes, delete it' }));
    await waitFor(() => expect(useGameStore.getState().worlds).toHaveLength(1));
    expect(useGameStore.getState().worldName).toBe('Castle');
  });
});
