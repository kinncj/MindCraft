import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import type { InteractionMode } from '../types/game';
import { IconButton } from './ui/IconButton';
import { Icon, type IconName } from './ui/icons';
import { Sheet } from './ui/Sheet';

const TOOLS: Array<{ id: InteractionMode; icon: IconName; label: string; aria: string; hint: string }> = [
  { id: 'place', icon: 'place', label: 'Place', aria: 'Place blocks mode', hint: 'Tap to build' },
  { id: 'interact', icon: 'interact', label: 'Interact', aria: 'Interact mode', hint: 'Doors, friends, switches' },
  { id: 'remove', icon: 'remove', label: 'Remove', aria: 'Remove blocks mode', hint: 'Tap to take away' },
  { id: 'room', icon: 'room', label: 'Room', aria: 'Room tool', hint: 'Two taps: floor and walls' },
  { id: 'fill', icon: 'fill', label: 'Fill', aria: 'Fill tool', hint: 'Two taps: a solid box' },
  { id: 'paint', icon: 'paint', label: 'Paint', aria: 'Paint tool', hint: 'Tap a block to change it' },
  { id: 'copy', icon: 'copy', label: 'Copy', aria: 'Copy tool', hint: 'Two taps: copy a box' },
  { id: 'paste', icon: 'paste', label: 'Paste', aria: 'Paste tool', hint: 'Tap to put it down, R turns' },
];

/** A Tools button that opens a sheet of big tool tiles. */
export function ToolsDrawer() {
  const mode = useGameStore((state) => state.mode);
  const setMode = useGameStore((state) => state.setMode);
  const mirror = useGameStore((state) => state.mirror);
  const setMirror = useGameStore((state) => state.setMirror);
  const setOpenPanel = useGameStore((state) => state.setOpenPanel);
  const [open, setOpen] = useState(false);
  const current = TOOLS.find((t) => t.id === mode) ?? TOOLS[0];

  return (
    <>
      <div className="tools-fab">
        <IconButton icon={current.icon} label={`Tools: ${current.label}`} showLabel size="lg" onClick={() => setOpen(true)} className="tools-fab-button" />
        {mirror && (
          <span className="tools-badge" aria-hidden="true">
            <Icon name="mirror" size={18} />
          </span>
        )}
      </div>
      {open && (
        <Sheet title="Tools" icon="tools" onClose={() => setOpen(false)} hint="Pick a tool, then tap the world.">
          <div className="tool-grid" role="toolbar" aria-label="Build tools">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`tool-tile ${mode === tool.id ? 'tool-tile-active' : ''}`}
                aria-pressed={mode === tool.id}
                aria-label={tool.aria}
                onClick={() => {
                  setMode(tool.id);
                  setOpen(false);
                }}
              >
                <span className="tool-tile-emoji" aria-hidden="true">
                  <Icon name={tool.icon} size={34} />
                </span>
                <span className="tool-tile-label">{tool.label}</span>
                <span className="tool-tile-hint">{tool.hint}</span>
              </button>
            ))}
            <button type="button" className={`tool-tile ${mirror ? 'tool-tile-active' : ''}`} aria-pressed={mirror} aria-label="Mirror building" onClick={() => setMirror(!mirror)}>
              <span className="tool-tile-emoji" aria-hidden="true">
                <Icon name="mirror" size={34} />
              </span>
              <span className="tool-tile-label">Mirror</span>
              <span className="tool-tile-hint">{mirror ? 'On: builds are doubled' : 'Double everything you build'}</span>
            </button>
            <button
              type="button"
              className="tool-tile"
              aria-label="Open the blueprints"
              onClick={() => {
                setOpen(false);
                setOpenPanel('blueprints');
              }}
            >
              <span className="tool-tile-emoji" aria-hidden="true">
                <Icon name="blueprint" size={34} />
              </span>
              <span className="tool-tile-label">Blueprints</span>
              <span className="tool-tile-hint">Stamp a house or a castle</span>
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
