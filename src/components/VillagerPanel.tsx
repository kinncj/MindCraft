import { useEffect, useRef, useState } from 'react';
import { TALK_CHOICES, jobById } from '../engine/entities/villagers';
import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';
import { Icon } from './ui/icons';

type Payload = { id: string; name?: string; variant?: string };

const CHIPS = [
  { label: '🏠 Build a house', text: 'build a house' },
  { label: '🏰 Build a castle', text: 'build a castle' },
  { label: '🌉 Build a bridge', text: 'build a bridge' },
  { label: '🏊 Build a pool', text: 'build a pool' },
  { label: '🚶 Follow me', text: 'follow me' },
  { label: '💃 Dance!', text: 'dance' },
  { label: '🌙 Make it night', text: 'make it night' },
  { label: '🐶 A puppy please', text: 'can I have a puppy' },
];

/**
 * Chat with a villager: picture chips for beginning readers, a text box
 * for the rest. The villager answers through the chat agent and does
 * what it says it will (building by hand, block by block).
 */
export function VillagerPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const payload = useGameStore((state) => state.panelPayload) as Payload | null;
  const closePanels = useGameStore((state) => state.closePanels);
  const lines = useGameStore((state) => (payload ? state.villagerLines[payload.id] : undefined));
  const pushVillagerLine = useGameStore((state) => state.pushVillagerLine);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines, thinking]);
  if (openPanel !== 'villager' || !payload) return null;
  const engine = getEngine();
  const villager = engine?.entities.byId(payload.id);
  if (!engine || !villager) return null;
  const job = jobById(villager.variant ?? '');
  const transcript = lines ?? [];

  const send = async (message: string): Promise<void> => {
    const trimmed = message.trim();
    if (!trimmed || thinking) return;
    setText('');
    pushVillagerLine(villager.id, 'kid', trimmed);
    setThinking(true);
    try {
      await engine.chat.send(villager.id, trimmed);
    } finally {
      setThinking(false);
    }
  };

  return (
    <Sheet title={`${villager.name} the ${job?.label ?? 'Villager'}`} emoji={job?.emoji ?? '🧑'} onClose={closePanels}>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="Chat">
        {transcript.length === 0 && <p className="speech-bubble villager">{job?.greeting ?? '👋 Hi! What should we do?'}</p>}
        {transcript.map((line, i) => (
          <p key={i} className={`speech-bubble ${line.who}`}>
            {line.text}
          </p>
        ))}
        {thinking && (
          <p className="speech-bubble villager thinking" aria-label="Thinking">
            <span>·</span>
            <span>·</span>
            <span>·</span>
          </p>
        )}
      </div>
      <div className="chip-row" role="group" aria-label="Quick things to say">
        {CHIPS.map((chip) => (
          <button key={chip.text} type="button" className="chip" onClick={() => void send(chip.text)} disabled={thinking}>
            {chip.label}
          </button>
        ))}
        {TALK_CHOICES.filter((c) => c.id === 'gift').map((choice) => (
          <button key={choice.id} type="button" className="chip" onClick={() => void send('can I have a gift')} disabled={thinking}>
            {choice.label}
          </button>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <label htmlFor="chat-text" className="visually-hidden">
          Say something
        </label>
        <input id="chat-text" value={text} maxLength={200} placeholder={`Say something to ${villager.name}…`} onChange={(event) => setText(event.target.value)} autoComplete="off" />
        <KidButton tone="primary" type="submit" aria-label="Send" disabled={thinking || !text.trim()}>
          <Icon name="send" size={26} />
        </KidButton>
      </form>
      <p className="chat-provider">
        Answered by: {engine.chat.providerName === 'rules' ? 'the game' : engine.chat.providerName === 'built-in' ? "your browser's built-in AI" : engine.chat.providerName === 'helper' ? 'the helper on this device' : engine.chat.providerName}
      </p>
    </Sheet>
  );
}
