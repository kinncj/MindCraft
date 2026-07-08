import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportWorldDialog } from '../../src/components/ImportWorldDialog';
import { Toast } from '../../src/components/Toast';
import { useGameStore } from '../../src/game/gameStore';
import { buildWorldExport } from '../../src/importExport/exportWorld';
import { WORLD_SIZE } from '../../src/game/engine/world';
import { resetGameStore } from './helpers';

function makeWorldFile(): File {
  const data = buildWorldExport({
    worldId: 'w1',
    worldName: 'Imported Land',
    size: WORLD_SIZE,
    blocks: [{ id: 'a', type: 'brick', position: { x: 4, y: 1, z: 4 } }],
    boxes: [
      {
        id: 'box-1',
        name: 'My Box',
        position: { x: 2, y: 1, z: 2 },
        items: [{ blockType: 'star', quantity: 5 }],
      },
    ],
    selectedBlockType: 'brick',
  });
  return new File([JSON.stringify(data)], 'world.json', { type: 'application/json' });
}

describe('ImportWorldDialog', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('shows a friendly error for files that are not worlds', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ImportWorldDialog />
        <Toast />
      </>,
    );
    const file = new File(['{"nope": true}'], 'nope.json', { type: 'application/json' });
    await user.upload(screen.getByTestId('import-file-input'), file);
    await waitFor(() => {
      expect(
        screen.getByText('That file does not look like a MindCraft world.'),
      ).toBeInTheDocument();
    });
  });

  it('asks before replacing the current world', async () => {
    const user = userEvent.setup();
    render(<ImportWorldDialog />);
    await user.upload(screen.getByTestId('import-file-input'), makeWorldFile());
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Import this world?' })).toBeInTheDocument();
    });
    expect(screen.getByText('Imported Land')).toBeInTheDocument();
    expect(
      screen.getByText('This will replace the world saved on this computer.'),
    ).toBeInTheDocument();
  });

  it('imports blocks and box contents after confirmation', async () => {
    const user = userEvent.setup();
    render(<ImportWorldDialog />);
    await user.upload(screen.getByTestId('import-file-input'), makeWorldFile());
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Import this world?' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Import World' }));
    await waitFor(() => {
      const state = useGameStore.getState();
      expect(Object.values(state.blocks)).toHaveLength(1);
      expect(state.boxes[0].items).toEqual([{ blockType: 'star', quantity: 5 }]);
      expect(state.worldName).toBe('Imported Land');
      expect(state.selectedBlockType).toBe('brick');
    });
  });

  it('cancels without touching the world', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      blocks: { '0,0,0': { id: 'keep', type: 'grass', position: { x: 0, y: 0, z: 0 } } },
    });
    render(<ImportWorldDialog />);
    await user.upload(screen.getByTestId('import-file-input'), makeWorldFile());
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Import this world?' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(useGameStore.getState().blocks['0,0,0']?.id).toBe('keep');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
