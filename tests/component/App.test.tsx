import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
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
  });

  it('keeps export, import, and reset in the menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Welcome to MindCraft!');
    await user.click(screen.getByRole('button', { name: 'Open the menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export your world to a file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import a world from a file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset the world' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '▶️ Back to building' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});
