import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

describe('App', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('loads and shows the welcome panel', async () => {
    render(<App />);
    expect(await screen.findByText('Welcome to MindCraft!')).toBeInTheDocument();
    expect(screen.getByLabelText('MindCraft')).toBeInTheDocument();
  });

  it('shows the main controls', async () => {
    render(<App />);
    await screen.findByText('Welcome to MindCraft!');
    expect(screen.getByRole('button', { name: 'Open the menu' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Pick a block' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo the last change' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More blocks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tools:/ })).toBeInTheDocument();
  });

  it('keeps export, import, reset, and worlds behind menu submenus with a back button', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Welcome to MindCraft!');
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save & share' }));
    expect(screen.getByRole('dialog', { name: 'Save & share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export your world to a file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import a world from a file' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByRole('button', { name: 'Reset the world' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'See all your worlds' }));
    expect(screen.getByRole('dialog', { name: 'Your worlds' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: /Back to building/ }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('opens the tools drawer with every build tool', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Welcome to MindCraft!');
    await user.click(screen.getByRole('button', { name: /^Tools:/ }));
    expect(screen.getByRole('toolbar', { name: 'Build tools' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Room tool' }));
    expect(useGameStore.getState().mode).toBe('room');
    expect(screen.queryByRole('toolbar', { name: 'Build tools' })).not.toBeInTheDocument();
  });
});
