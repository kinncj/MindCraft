import { useState } from 'react';
import { blocks } from '../engine/blocks/blocks';
import { blockIconDataUrl } from '../game/blockIcons';
import { useContainer, useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

type Pos = { x: number; y: number; z: number };

/**
 * The storage panel for a Magic Delivery Box. Opens when the player
 * taps a box block in the world. Contents live in the block itself.
 */
export function MagicDeliveryBoxPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const payload = useGameStore((state) => state.panelPayload) as { position?: Pos } | null;
  const selectedBlockType = useGameStore((state) => state.selectedBlockType);
  const addItemToBox = useGameStore((state) => state.addItemToBox);
  const takeItemFromBox = useGameStore((state) => state.takeItemFromBox);
  const clearBox = useGameStore((state) => state.clearBox);
  const renameBox = useGameStore((state) => state.renameBox);
  const closePanels = useGameStore((state) => state.closePanels);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const position = openPanel === 'container' ? (payload?.position ?? null) : null;
  const box = useContainer(position);
  if (!position || !box) return null;

  const selectedDef = blocks.byId(selectedBlockType);

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

        <p className="panel-hint">Put blocks inside. Take blocks out. Saved with your world.</p>

        {renaming ? (
          <form
            className="rename-form"
            onSubmit={(event) => {
              event.preventDefault();
              renameBox(position, nameDraft);
              setRenaming(false);
            }}
          >
            <label htmlFor="box-name">New name for your box</label>
            <input id="box-name" value={nameDraft} maxLength={60} onChange={(event) => setNameDraft(event.target.value)} autoFocus />
            <KidButton tone="primary" aria-label="Save box name" type="submit">
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

        {selectedDef && (
          <div className="box-actions">
            <KidButton tone="primary" onClick={() => addItemToBox(position, selectedDef.id)}>
              <span aria-hidden="true">{selectedDef.emoji}</span> Put a {selectedDef.label} block inside
            </KidButton>
          </div>
        )}

        <h3>Inside the box</h3>
        {box.items.length === 0 ? (
          <p className="box-empty">Your box is empty</p>
        ) : (
          <ul className="box-items">
            {box.items.map((item) => {
              const def = blocks.byId(item.blockType);
              if (!def) return null;
              const icon = blockIconDataUrl(item.blockType);
              return (
                <li key={item.blockType} className="box-item">
                  <span
                    className="box-item-icon"
                    style={icon ? { backgroundImage: `url(${icon})`, backgroundColor: def.color } : { background: def.color }}
                    aria-hidden="true"
                  >
                    {!icon && def.emoji}
                  </span>
                  <span className="box-item-label">
                    {def.label} × {item.quantity}
                  </span>
                  <KidButton onClick={() => takeItemFromBox(position, item.blockType)}>Take one out</KidButton>
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
                  clearBox(position);
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
