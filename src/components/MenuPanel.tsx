import { useEffect, useState } from 'react';
import { useGameStore } from '../game/gameStore';
import { getEngine } from '../game/engineRef';
import { AvatarPreview } from './AvatarPreview';
import { ExportWorldButton } from './ExportWorldButton';
import { ImportWorldDialog } from './ImportWorldDialog';
import { ResetWorldDialog } from './ResetWorldDialog';
import { VisualModeSelector } from './VisualModeSelector';
import { WorldSettings } from './WorldSettings';
import { WorldsList } from './WorldsList';
import { KidButton } from './KidButton';
import { IconButton } from './ui/IconButton';
import { Icon, type IconName } from './ui/icons';
import { MenuRow } from './ui/MenuRow';
import { Sheet } from './ui/Sheet';

type Page = 'main' | 'help' | 'looks' | 'sound' | 'friends' | 'worlds' | 'share' | 'reset' | 'about';

const TITLES: Record<Page, { title: string; icon: IconName }> = {
  main: { title: 'Menu', icon: 'menu' },
  help: { title: 'How to play', icon: 'help' },
  looks: { title: 'World looks', icon: 'rainbow' },
  sound: { title: 'Sound', icon: 'sound' },
  friends: { title: 'Friends', icon: 'friends' },
  worlds: { title: 'Your worlds', icon: 'world' },
  share: { title: 'Save & share', icon: 'save' },
  reset: { title: 'Start over', icon: 'restart' },
  about: { title: 'About', icon: 'info' },
};

/**
 * The game menu: a full-screen overlay with the character on one side
 * and big buttons on the other; submenus open as sheets with a back
 * button. Everything that is not moment-to-moment play lives here.
 */
export function MenuPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const closePanels = useGameStore((state) => state.closePanels);
  const setOpenPanel = useGameStore((state) => state.setOpenPanel);
  const storageAvailable = useGameStore((state) => state.storageAvailable);
  const worldName = useGameStore((state) => state.worldName);
  const worlds = useGameStore((state) => state.worlds);
  const currentWorldId = useGameStore((state) => state.currentWorldId);
  const look = useGameStore((state) => state.look);
  const audio = useGameStore((state) => state.audio);
  const setAudio = useGameStore((state) => state.setAudio);
  const smartChat = useGameStore((state) => state.smartChat);
  const setSmartChat = useGameStore((state) => state.setSmartChat);
  const helper = useGameStore((state) => state.helper);
  const downloadHelper = useGameStore((state) => state.downloadHelper);
  const setHelperEnabled = useGameStore((state) => state.setHelperEnabled);
  const removeHelper = useGameStore((state) => state.removeHelper);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const gpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const [page, setPage] = useState<Page>('main');
  const [builtIn, setBuiltIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (page !== 'friends') return;
    const engine = getEngine();
    if (!engine) {
      setBuiltIn(false);
      return;
    }
    void engine.chat.builtInAvailable().then(setBuiltIn);
  }, [page]);

  const open = openPanel === 'menu' || openPanel === 'worlds';
  useEffect(() => {
    if (openPanel === 'worlds') setPage('worlds');
    else if (openPanel === 'menu') setPage('main');
  }, [openPanel]);

  if (!open) return null;
  const world = worlds.find((w) => w.id === currentWorldId);
  const worldKind = world?.generator.preset === 'town' ? 'Sunny Town' : world?.generator.preset === 'toyland' || world?.generator.kind === 'flat' ? 'Toy Land' : 'Meadow';

  if (page === 'main') {
    return (
      <div className="game-menu" role="dialog" aria-label="Menu" aria-modal="true">
        <header className="game-menu-header">
          <div className="game-menu-logo">
            <Icon name="blocks" size={40} />
            <span>MindCraft</span>
          </div>
          <IconButton icon="close" label="Close Menu" onClick={closePanels} size="lg" />
        </header>
        <div className="game-menu-body">
          <aside className="game-menu-side">
            <AvatarPreview look={look} />
            <div className="game-menu-card">
              <span className="game-menu-card-label">Playing in</span>
              <strong className="game-menu-card-value">{worldName}</strong>
              <span className="game-menu-card-hint">{worldKind}</span>
            </div>
            <KidButton onClick={() => setOpenPanel('dressup')} aria-label="Dress up your character" className="game-menu-dressup">
              <Icon name="shirt" size={24} /> Dress up
            </KidButton>
          </aside>
          <nav className="game-menu-list menu-list" aria-label="Menu">
            <KidButton tone="primary" className="menu-primary" onClick={closePanels} autoFocus>
              <Icon name="play" size={26} /> Back to building
            </KidButton>
            <MenuRow tone="accent" icon="craft" label="Crafting" hint="Picture recipes to make things" onClick={() => setOpenPanel('crafting')} ariaLabel="Open crafting" />
            <MenuRow tone="violet" icon="rainbow" label="World looks" hint="Visual mode, sky, and weather" onClick={() => setPage('looks')} />
            <MenuRow tone="teal" icon="sound" label="Sound" hint={audio.muted ? 'Muted' : audio.music ? 'Music and effects on' : 'Effects only'} onClick={() => setPage('sound')} />
            <MenuRow tone="pink" icon="friends" label="Friends" hint={smartChat ? 'Chats use the built-in AI' : 'How villagers answer chats'} onClick={() => setPage('friends')} />
            <MenuRow tone="primary" icon="world" label="My worlds" hint={`${worlds.length} world${worlds.length === 1 ? '' : 's'}`} onClick={() => setPage('worlds')} ariaLabel="See all your worlds" />
            <MenuRow tone="default" icon="save" label="Save & share" hint="Export and import world files" onClick={() => setPage('share')} />
            <MenuRow tone="danger" icon="restart" label="Start over" hint="Fresh meadow, Toy Land, or Sunny Town" onClick={() => setPage('reset')} />
            <MenuRow tone="slate" icon="help" label="How to play" hint="Keyboard, touch, and gamepad" onClick={() => setPage('help')} />
            <MenuRow tone="slate" icon="info" label="About" hint="Privacy and credits" onClick={() => setPage('about')} />
            <p className="menu-footer">{storageAvailable ? 'Saved on this computer. Export a world to keep it forever.' : 'This browser cannot save — export your world to keep it!'}</p>
          </nav>
        </div>
      </div>
    );
  }

  const { title, icon } = TITLES[page];
  return (
    <Sheet title={title} icon={icon} onClose={closePanels} onBack={() => setPage('main')} testId="menu">
      {page === 'help' && (
        <ul className="welcome-tips menu-help">
          <li>🚶 Walk with WASD or the arrow keys, jump with space, hold Ctrl to run, X to dance</li>
          <li>👆 Tap the ground or a block to build; the green ghost shows where</li>
          <li>🧽 Use the Remove tool (or right-click) to take blocks away</li>
          <li>🖱️ Drag to look around, scroll (or the + − buttons, or pinch) to zoom, arrows or WASD to move</li>
          <li>👀 Press V (or zoom all the way in) to look through your own eyes</li>
          <li>🧱 Press E for all the blocks, C for crafting, and Undo if you make a mistake</li>
          <li>🛠️ The Tools button has Interact, Room, Fill, Paint, Copy, Paste, Mirror, and Blueprints</li>
          <li>🚪 Tap doors to open them, beds to sleep, chairs to sit, boxes to store treasures</li>
          <li>🐶 Find Friends & Rides in the block list: puppies, kitties, neighbors, robots, a car and a boat</li>
          <li>💬 Tap a neighbor to chat: ask for a house, a castle, a puppy, or a dance</li>
          <li>🪽 Tap Jump twice quickly (or the wing button) to fly: hold Jump to rise, Sneak to sink, land to stop</li>
          <li>🚗 Tap a ride to hop in, or ask a neighbor to drive or fly it around; tap it again (or press space) to hop off</li>
          <li>✈️ Planes need speed to take off, then Jump climbs and Sneak dives; helicopters lift with Jump. Tap them again (or press E) to hop out</li>
          <li>🎚️ Levers, buttons, and plates power wires, lamps, pistons, doors, and note blocks</li>
          <li>🤖 Tap a robot to give it a card program: forward, place, repeat…</li>
          <li>📱 On a phone: touch and drag in the lower-left to walk (the joystick appears under your finger), Jump button, pinch to zoom</li>
          <li>🖱️ Mouse: click the world once to grab it, then look freely; left-click removes, right-click places, the wheel picks blocks, Esc lets go</li>
          <li>🎮 Gamepad: sticks move and look, A jumps, LT places, RT removes, Y opens all blocks, D-pad up changes the view, Start opens this menu</li>
        </ul>
      )}
      {page === 'looks' && (
        <>
          <VisualModeSelector />
          <WorldSettings />
        </>
      )}
      {page === 'sound' && (
        <div className="menu-list">
          <p className="sheet-hint">All the music is made up on the spot by the game. It changes with where you are and the time of day.</p>
          <div className="setting-group" role="group" aria-label="Sound">
            <KidButton tone={audio.muted ? 'primary' : 'default'} aria-pressed={audio.muted} onClick={() => setAudio({ muted: !audio.muted })}>
              {audio.muted ? '🔇 Muted' : '🔊 Sound on'}
              <span className="setting-hint">Tap to {audio.muted ? 'unmute' : 'mute everything'}</span>
            </KidButton>
            <KidButton tone={audio.music ? 'primary' : 'default'} aria-pressed={audio.music} onClick={() => setAudio({ music: !audio.music })}>
              {audio.music ? '🎵 Music on' : '🎵 Music off'}
              <span className="setting-hint">The soundtrack</span>
            </KidButton>
          </div>
          <div className="setting-group" role="group" aria-label="Volume">
            <h3>How loud</h3>
            {[
              { v: 0.35, label: '🔉 Quiet' },
              { v: 0.7, label: '🔊 Normal' },
              { v: 1, label: '📢 Loud' },
            ].map((opt) => (
              <KidButton key={opt.v} tone={Math.abs(audio.volume - opt.v) < 0.05 ? 'primary' : 'default'} aria-pressed={Math.abs(audio.volume - opt.v) < 0.05} onClick={() => setAudio({ volume: opt.v, muted: false })}>
                {opt.label}
              </KidButton>
            ))}
          </div>
        </div>
      )}
      {page === 'friends' && (
        <div className="menu-list">
          <p className="sheet-hint">Tap a villager and chat. Ask for a house, a castle, a pool, a puppy, a dance, night time… and watch them do it.</p>
          <div className="setting-group" role="group" aria-label="Villager chat">
            <KidButton tone={!smartChat ? 'primary' : 'default'} aria-pressed={!smartChat} onClick={() => setSmartChat(false)}>
              🧠 Built into the game
              <span className="setting-hint">Understands building, weather, pets, and friends. Always works, always safe.</span>
            </KidButton>
            <KidButton tone={smartChat ? 'primary' : 'default'} aria-pressed={smartChat} onClick={() => setSmartChat(true)} disabled={builtIn === false}>
              ✨ Your browser's built-in AI
              <span className="setting-hint">
                {builtIn === null ? 'Checking…' : builtIn ? 'On-device model found. Answers are filtered and kept short.' : 'Not available in this browser (nothing is downloaded).'}
              </span>
            </KidButton>
          </div>
          <h3>A smarter helper (grown-ups)</h3>
          <div className="helper-card">
            {helper.status === 'ready' ? (
              <>
                <p className="sheet-hint">A small language model lives on this device now. Villagers understand all sorts of requests.</p>
                <div className="dialog-buttons">
                  <KidButton tone={helper.enabled ? 'primary' : 'default'} aria-pressed={helper.enabled} onClick={() => setHelperEnabled(!helper.enabled)}>
                    {helper.enabled ? '✨ Helper on' : '✨ Helper off'}
                  </KidButton>
                  <KidButton tone="danger" onClick={() => void removeHelper()} aria-label="Remove the helper from this device">
                    🗑️ Remove helper
                  </KidButton>
                </div>
              </>
            ) : helper.status === 'napping' ? (
              <>
                <p className="sheet-hint">💤 The helper is napping while Cinema is on: phones and tablets do not have room for both. Pick another look and it wakes up.</p>
                <div className="dialog-buttons">
                  <KidButton tone="danger" onClick={() => void removeHelper()} aria-label="Remove the helper from this device">
                    🗑️ Remove helper
                  </KidButton>
                </div>
              </>
            ) : helper.status === 'downloading' || helper.status === 'loading' ? (
              <>
                <p className="sheet-hint">{helper.status === 'loading' ? 'Loading the helper from this device…' : 'Downloading the helper…'} {Math.round(helper.progress * 100)}%</p>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(helper.progress * 100)}>
                  <div className="progress-bar" style={{ width: `${Math.round(helper.progress * 100)}%` }} />
                </div>
                <p className="menu-footer">{helper.text}</p>
              </>
            ) : confirmDownload ? (
              <>
                <p className="sheet-hint">
                  This downloads a small language model (about 400 MB, once) from its host on the internet and keeps it on this device. Nothing the child types is ever sent anywhere. It needs a recent browser with WebGPU.
                </p>
                <div className="dialog-buttons">
                  <KidButton tone="primary" onClick={() => { setConfirmDownload(false); void downloadHelper(); }} aria-label="Yes, download the helper">
                    ⬇️ Yes, download (400 MB)
                  </KidButton>
                  <KidButton onClick={() => setConfirmDownload(false)}>Not now</KidButton>
                </div>
              </>
            ) : (
              <>
                <p className="sheet-hint">{gpu ? 'Villagers can understand almost anything with a small language model kept on this device. Phones and tablets get a smaller one that fits their memory.' : 'This browser has no WebGPU, so the helper cannot run here.'}</p>
                {helper.status === 'error' && <p className="menu-footer">Last try failed: {helper.text}</p>}
                <KidButton tone="primary" disabled={!gpu} onClick={() => setConfirmDownload(true)} aria-label="Download a smarter helper">
                  ⬇️ Download a smarter helper
                </KidButton>
              </>
            )}
          </div>
          <p className="menu-footer">An outside agent can answer chats too, through window.mindcraftChat and the WebMCP tools. Apart from the helper download a grown-up starts, nothing here ever talks to the internet.</p>
        </div>
      )}
      {page === 'worlds' && <WorldsList />}
      {page === 'share' && (
        <div className="menu-list">
          <p className="sheet-hint">Worlds are saved on this computer. A file keeps one forever, or moves it to another computer.</p>
          <ExportWorldButton />
          <ImportWorldDialog />
        </div>
      )}
      {page === 'reset' && (
        <div className="menu-list">
          <p className="sheet-hint">Each of these replaces the world you are playing now. You can export it first.</p>
          <ResetWorldDialog />
          <ResetWorldDialog preset="toyland" />
          <ResetWorldDialog preset="town" />
        </div>
      )}
      {page === 'about' && (
        <div className="menu-list about">
          <p>
            <strong>MindCraft 2.0</strong> is a creative block game for small kids: craft what you have in mind. No accounts, no ads, no internet needed — everything stays on this device.
          </p>
          <p>No monsters, no health, no failing. Just building, animals, friends, and cozy nights.</p>
          <p>Original code and art, MIT licensed. Not affiliated with Minecraft, Mojang, Microsoft, Roblox, or The Sims.</p>
        </div>
      )}
    </Sheet>
  );
}
