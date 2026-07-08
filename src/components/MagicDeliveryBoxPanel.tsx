import { useState } from 'react';
import { BLOCK_DEFINITIONS } from '../game/engine/blockRegistry';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

/**
 * The storage panel for a Magic Delivery Box. Opens when the player
 * taps a box block in the world.
 */
export function MagicDeliveryBoxPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const activeBoxId = useGameStore((state) => state.activeBoxId);
  const boxes = useGameStore((state) => state.boxes);
  const selectedBlockType = useGameStore((state) => state.selectedBlockType);
  const addItemToBox = useGameStore((state) => state.addItemToBox);
  const takeItemFromBox = useGameStore((state) => state.takeItemFromBox);
  const clearBox = useGameStore((state) => state.clearBox);
  const renameBox = useGameStore((state) => state.renameBox);
  const closePanels = useGameStore((state) => state.closePanels);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const box = boxes.find((b) => b.id === activeBoxId);
  if (openPanel !== 'magic-box' || !box) return null;

  const selectedDef = BLOCK_DEFINITIONS[selectedBlockType];

  return (
    <div className="panel-backdrop" role="presentation">
      <section className="panel magic-box-panel" role="dialog" aria-label={box.name} aria-modal="true">
        <header className="panel-header">
          <h2>
            <span aria-hidden="true">📦</span> {box.name}
          </h2>
          <KidButton onClick={closePanels} aria-label="Close the box">
            ✖ Close
          </KidButton>
        </header>

        <p className="panel-hint">Put blocks inside. Take blocks out. Saved in your browser.</p>

        {renaming ? (
          <form
            className="rename-form"
            onSubmit={(event) => {
              event.preventDefault();
              renameBox(box.id, nameDraft);
              setRenaming(false);
            }}
          >
            <label htmlFor="box-name">New name for your box</label>
            <input
              id="box-name"
              value={nameDraft}
              maxLength={60}
              onChange={(event) => setNameDraft(event.target.value)}
              autoFocus
            />
            <KidButton tone="primary" onClick={() => {}} aria-label="Save box name" type="submit">
              Save name
            </KidButton>
            <KidButton onClick={() => setRenaming(false)}>Cancel</KidButton>
          </form>
        ) : (
          <KidButton
            onClick={() => {
              setNameDraft(box.name);
              setRenaming(true);
            }}
          >
            ✏️ Rename box
          </KidButton>
        )}

        <div className="box-actions">
          <KidButton tone="primary" onClick={() => addItemToBox(box.id, selectedBlockType)}>
            <span aria-hidden="true">{selectedDef.emoji}</span> Put a {selectedDef.label} block inside
          </KidButton>
        </div>

        <h3>Inside the box</h3>
        {box.items.length === 0 ? (
          <p className="box-empty">Your box is empty</p>
        ) : (
          <ul className="box-items">
            {box.items.map((item) => {
              const def = BLOCK_DEFINITIONS[item.blockType];
              return (
                <li key={item.blockType} className="box-item">
                  <span className="box-item-icon" style={{ background: def.color }} aria-hidden="true">
                    {def.emoji}
                  </span>
                  <span className="box-item-label">
                    {def.label} × {item.quantity}
                  </span>
                  <KidButton onClick={() => takeItemFromBox(box.id, item.blockType)}>
                    Take one out
                  </KidButton>
                </li>
              );
            })}
          </ul>
        )}

        {box.items.length > 0 &&
          (confirmingClear ? (
            <div className="confirm-row" role="alertdialog" aria-label="Empty the whole box?">
              <p>Empty the whole box?</p>
              <KidButton
                tone="danger"
                onClick={() => {
                  clearBox(box.id);
                  setConfirmingClear(false);
                }}
              >
                Yes, empty it
              </KidButton>
              <KidButton onClick={() => setConfirmingClear(false)}>No, keep everything</KidButton>
            </div>
          ) : (
            <KidButton tone="danger" onClick={() => setConfirmingClear(true)}>
              🧹 Empty the box
            </KidButton>
          ))}
      </section>
    </div>
  );
}
