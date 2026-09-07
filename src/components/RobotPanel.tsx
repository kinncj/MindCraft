import { useState } from 'react';
import { blocks } from '../engine/blocks/blocks';
import { CARD_LABELS, type RobotCard, type RobotProgram } from '../engine/entities/robot';
import { blockIconDataUrl } from '../game/blockIcons';
import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

type Payload = { id: string; name?: string };

const SIMPLE_OPS = ['forward', 'back', 'left', 'right', 'turn_left', 'turn_right', 'up', 'down', 'place', 'remove', 'wait'] as const;

function cardText(card: RobotCard): string {
  if (card.op === 'repeat') return `🔁 ×${card.times} [${card.body.map(cardText).join(' ')}]`;
  const info = CARD_LABELS[card.op];
  return info.emoji;
}

/** Program a robot with picture cards: tap cards to add them, then Run. */
export function RobotPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const payload = useGameStore((state) => state.panelPayload) as Payload | null;
  const closePanels = useGameStore((state) => state.closePanels);
  const selectedBlockType = useGameStore((state) => state.selectedBlockType);
  const showToast = useGameStore((state) => state.showToast);
  const markDirty = useGameStore((state) => state.markDirty);
  const [, bump] = useState(0);
  const [repeatTimes, setRepeatTimes] = useState(3);
  const [allBlocks, setAllBlocks] = useState(false);
  const hotbar = useGameStore((state) => state.hotbar);
  const [building, setBuilding] = useState<RobotCard[] | null>(null); // cards inside a repeat being built
  if (openPanel !== 'robot' || !payload) return null;
  const engine = getEngine();
  const robot = engine?.entities.byId(payload.id);
  if (!engine || !robot?.robot) return null;
  const runner = robot.robot;
  const program: RobotProgram = runner.program;
  if (runner.blockId === 0) {
    const def = blocks.byId(selectedBlockType);
    if (def) runner.blockId = def.numericId;
  }
  const blockDef = blocks.get(runner.blockId);
  const blockIcon = blockDef ? blockIconDataUrl(blockDef.id) : null;
  const choices = (allBlocks ? blocks.palette().filter((d) => !d.spawns).map((d) => d.id) : hotbar);
  const refresh = (): void => {
    markDirty();
    bump((n) => n + 1);
  };
  const add = (card: RobotCard): void => {
    if (building) setBuilding([...building, card]);
    else runner.setProgram([...program, card]);
    refresh();
  };

  return (
    <Sheet title={`${robot.name ?? 'Robot'} the robot`} emoji="🤖" onClose={closePanels} hint="Tap cards to build a program, then press Run.">
      <div className="robot-program" role="status" aria-live="polite" aria-label="Program">
        {program.length === 0 && !building && <span className="craft-hint">No cards yet. Tap some below!</span>}
        {program.map((card, i) => (
          <span key={i} className="robot-card">
            {cardText(card)}
          </span>
        ))}
        {building && <span className="robot-card robot-card-building">🔁 ×{repeatTimes} [{building.map(cardText).join(' ')} …]</span>}
      </div>
      <div className="dialog-buttons">
        <KidButton
          tone="primary"
          onClick={() => {
            if (runner.running) runner.stop();
            else runner.run();
            showToast(runner.running ? '🤖 Beep! Running the program!' : '🤖 Stopped.');
            refresh();
          }}
        >
          {runner.running ? '⏹️ Stop' : '▶️ Run'}
        </KidButton>
        <KidButton
          onClick={() => {
            if (building) setBuilding(building.slice(0, -1));
            else runner.setProgram(program.slice(0, -1));
            refresh();
          }}
          aria-label="Remove the last card"
        >
          ⌫ Undo card
        </KidButton>
        <KidButton
          tone="danger"
          onClick={() => {
            runner.setProgram([]);
            setBuilding(null);
            refresh();
          }}
        >
          🧹 Clear all
        </KidButton>
      </div>
      <h3>Cards</h3>
      <div className="tool-grid robot-cards">
        {SIMPLE_OPS.map((op) => (
          <button key={op} type="button" className="tool-tile" aria-label={`Add ${CARD_LABELS[op].label}`} onClick={() => add({ op })}>
            <span className="tool-tile-emoji" aria-hidden="true">
              {CARD_LABELS[op].emoji}
            </span>
            <span className="tool-tile-label">{CARD_LABELS[op].label}</span>
          </button>
        ))}
        {building ? (
          <button
            type="button"
            className="tool-tile tool-tile-active"
            aria-label="Finish the repeat"
            onClick={() => {
              runner.setProgram([...program, { op: 'repeat', times: repeatTimes, body: building }]);
              setBuilding(null);
              refresh();
            }}
          >
            <span className="tool-tile-emoji" aria-hidden="true">
              ✅
            </span>
            <span className="tool-tile-label">Done repeating</span>
          </button>
        ) : (
          <button type="button" className="tool-tile" aria-label={`Start a repeat ${repeatTimes} times`} onClick={() => setBuilding([])}>
            <span className="tool-tile-emoji" aria-hidden="true">
              🔁
            </span>
            <span className="tool-tile-label">Repeat ×{repeatTimes}</span>
            <span className="tool-tile-hint">then add cards inside</span>
          </button>
        )}
      </div>
      <div className="dialog-buttons">
        <KidButton onClick={() => setRepeatTimes(Math.max(2, repeatTimes - 1))} aria-label="Fewer repeats">
          ➖ Fewer
        </KidButton>
        <KidButton onClick={() => setRepeatTimes(Math.min(20, repeatTimes + 1))} aria-label="More repeats">
          ➕ More
        </KidButton>
      </div>
      <h3>Builds with</h3>
      <div className="robot-block-row">
        <span className="craft-cell craft-cell-mini" style={blockIcon ? { backgroundImage: `url(${blockIcon})`, backgroundColor: blockDef?.color } : undefined} aria-hidden="true" />
        <span className="robot-block-label" role="status">{blockDef?.label ?? 'Nothing yet'}</span>
        <KidButton onClick={() => setAllBlocks((v) => !v)} aria-label={allBlocks ? 'Show my hotbar blocks' : 'Show all blocks'}>
          {allBlocks ? '🎒 My blocks' : '🧱 All blocks'}
        </KidButton>
      </div>
      <div className="palette-grid ingredient-grid" role="group" aria-label="Pick a block for the robot">
        {choices.map((id) => {
          const def = blocks.byId(id);
          if (!def) return null;
          const icon = blockIconDataUrl(id);
          const active = runner.blockId === def.numericId;
          return (
            <button
              key={id}
              type="button"
              className={`craft-cell ${active ? 'craft-cell-selected' : ''}`}
              style={icon ? { backgroundImage: `url(${icon})`, backgroundColor: def.color } : { background: def.color }}
              aria-label={`Robot builds with ${def.label}`}
              aria-pressed={active}
              onClick={() => {
                runner.blockId = def.numericId;
                showToast(`🤖 ${robot.name ?? 'Robot'} will build with ${def.label}!`);
                refresh();
              }}
            >
              {!icon && <span aria-hidden="true">{def.emoji}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
