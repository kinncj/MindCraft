import { useGameStore } from '../game/gameStore';
import type { InteractionMode } from '../types/game';
import { KidButton } from './KidButton';

const TOOLS: Array<{ id: InteractionMode; label: string; aria: string }> = [
  { id: 'place', label: '✨ Place', aria: 'Place blocks mode' },
  { id: 'remove', label: '🧽 Remove', aria: 'Remove blocks mode' },
  { id: 'room', label: '🏠 Room', aria: 'Room tool' },
  { id: 'fill', label: '🧱 Fill', aria: 'Fill tool' },
  { id: 'paint', label: '🎨 Paint', aria: 'Paint tool' },
  { id: 'copy', label: '📋 Copy', aria: 'Copy tool' },
  { id: 'paste', label: '📌 Paste', aria: 'Paste tool' },
];

/** The build tools: big buttons, one tap each. */
export function ToolsBar() {
  const mode = useGameStore((state) => state.mode);
  const setMode = useGameStore((state) => state.setMode);
  const mirror = useGameStore((state) => state.mirror);
  const setMirror = useGameStore((state) => state.setMirror);
  const setOpenPanel = useGameStore((state) => state.setOpenPanel);
  return (
    <div className="tools-bar" role="toolbar" aria-label="Build tools">
      {TOOLS.map((tool) => (
        <KidButton key={tool.id} tone={mode === tool.id ? 'primary' : 'default'} onClick={() => setMode(tool.id)} aria-pressed={mode === tool.id} aria-label={tool.aria}>
          {tool.label}
        </KidButton>
      ))}
      <KidButton tone={mirror ? 'primary' : 'default'} onClick={() => setMirror(!mirror)} aria-pressed={mirror} aria-label="Mirror building">
        🪞 Mirror
      </KidButton>
      <KidButton onClick={() => setOpenPanel('blueprints')} aria-label="Open the blueprints">
        📐 Blueprints
      </KidButton>
    </div>
  );
}
