import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

/** Your worlds: open one, make a new one, or say goodbye to one. */
export function WorldsList() {
  const worlds = useGameStore((state) => state.worlds);
  const currentWorldId = useGameStore((state) => state.currentWorldId);
  const openWorld = useGameStore((state) => state.openWorld);
  const createWorld = useGameStore((state) => state.createWorld);
  const deleteWorld = useGameStore((state) => state.deleteWorld);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  return (
    <>
      <ul className="worlds-list">
        {worlds.map((world) => {
          const current = world.id === currentWorldId;
          return (
            <li key={world.id} className={`world-row ${current ? 'world-row-current' : ''}`}>
              <span className="world-name">
                <span aria-hidden="true">{world.generator.preset === 'town' ? '🏘️' : world.generator.kind === 'flat' ? '🧸' : '🌄'}</span> {world.name}
                {current && <span className="world-badge"> · playing now</span>}
              </span>
              <span className="world-actions">
                {!current && (
                  <KidButton tone="primary" onClick={() => void openWorld(world.id)} aria-label={`Open ${world.name}`}>
                    ▶️ Open
                  </KidButton>
                )}
                {confirmDelete === world.id ? (
                  <>
                    <KidButton tone="danger" onClick={() => void deleteWorld(world.id).then(() => setConfirmDelete(null))}>
                      Yes, delete it
                    </KidButton>
                    <KidButton onClick={() => setConfirmDelete(null)}>Keep it</KidButton>
                  </>
                ) : (
                  <KidButton onClick={() => setConfirmDelete(world.id)} aria-label={`Delete ${world.name}`}>
                    🗑️
                  </KidButton>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <form
        className="new-world-form"
        onSubmit={(event) => {
          event.preventDefault();
          void createWorld(newName || 'New World', 'meadow');
          setNewName('');
        }}
      >
        <label htmlFor="new-world-name">Make a new world</label>
        <input id="new-world-name" value={newName} maxLength={60} placeholder="Name your world" onChange={(event) => setNewName(event.target.value)} />
        <div className="dialog-buttons">
          <KidButton tone="primary" type="submit">
            🌱 New meadow
          </KidButton>
          <KidButton
            onClick={() => {
              void createWorld(newName || 'Toy Land', 'toyland');
              setNewName('');
            }}
          >
            🧸 New Toy Land
          </KidButton>
          <KidButton
            onClick={() => {
              void createWorld(newName || 'Sunny Town', 'town');
              setNewName('');
            }}
          >
            🏘️ New Sunny Town
          </KidButton>
        </div>
      </form>
    </>
  );
}
