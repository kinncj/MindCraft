import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportWorldDialog } from '../../src/components/ImportWorldDialog';
import { Toast } from '../../src/components/Toast';
import { useGameStore } from '../../src/game/gameStore';
import { resetGameStore } from './helpers';

function makeV1File(): File {
  const data = {
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: '2026-07-08T12:00:00.000Z',
    world: { id: 'w1', name: 'Imported Land', size: { width: 64, depth: 64, height: 32 }, blocks: [{ id: 'a', type: 'brick', position: { x: 4, y: 1, z: 4 } }] },
    inventory: { selectedBlockType: 'brick' },
    magicDeliveryBoxes: [],
  };
  return new File([JSON.stringify(data)], 'world.json', { type: 'application/json' });
}

describe('ImportWorldDialog', () => {
  beforeEach(() => {
    resetGameStore();
    useGameStore.setState({ storageAvailable: false, ready: true });
  });

  it('shows a friendly error for files that are not worlds', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ImportWorldDialog />
        <Toast />
      </>,
    );
    await user.upload(screen.getByTestId('import-file-input'), new File(['{"nope": true}'], 'nope.json', { type: 'application/json' }));
    await waitFor(() => expect(screen.getByText('That file does not look like a MindCraft world.')).toBeInTheDocument());
  });

  it('asks before importing, then adds and opens the world', async () => {
    const user = userEvent.setup();
    render(<ImportWorldDialog />);
    await user.upload(screen.getByTestId('import-file-input'), makeV1File());
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Import this world?' })).toBeInTheDocument());
    expect(screen.getByText('Imported Land')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Import World' }));
    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.worldName).toBe('Imported Land');
      expect(state.selectedBlockType).toBe('brick');
      expect(state.worlds[0].generator.kind).toBe('flat');
      expect(state.currentWorldId).toBe(state.worlds[0].id);
    });
  });

  it('cancels without touching anything', async () => {
    const user = userEvent.setup();
    render(<ImportWorldDialog />);
    await user.upload(screen.getByTestId('import-file-input'), makeV1File());
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Import this world?' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useGameStore.getState().worlds).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
