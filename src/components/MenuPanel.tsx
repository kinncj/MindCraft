import { useEffect, useState } from 'react';
import { useGameStore } from '../game/gameStore';
import { ExportWorldButton } from './ExportWorldButton';
import { ImportWorldDialog } from './ImportWorldDialog';
import { ResetWorldDialog } from './ResetWorldDialog';
import { VisualModeSelector } from './VisualModeSelector';
import { WorldSettings } from './WorldSettings';
import { WorldsList } from './WorldsList';
import { KidButton } from './KidButton';
import { MenuRow } from './ui/MenuRow';
import { Sheet } from './ui/Sheet';

type Page = 'main' | 'help' | 'looks' | 'sound' | 'worlds' | 'share' | 'reset' | 'about';

const TITLES: Record<Page, { title: string; emoji: string }> = {
  main: { title: 'Menu', emoji: '🧱' },
  help: { title: 'How to play', emoji: '❓' },
  looks: { title: 'World looks', emoji: '🌈' },
  sound: { title: 'Sound', emoji: '🔊' },
  worlds: { title: 'Your worlds', emoji: '🌍' },
  share: { title: 'Save & share', emoji: '💾' },
  reset: { title: 'Start over', emoji: '🔄' },
  about: { title: 'About', emoji: 'ℹ️' },
};

/**
 * The game menu: one sheet, a main list, and submenus with a back
 * button. Everything that is not moment-to-moment play lives here.
 */
export function MenuPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const closePanels = useGameStore((state) => state.closePanels);
  const setOpenPanel = useGameStore((state) => state.setOpenPanel);
  const storageAvailable = useGameStore((state) => state.storageAvailable);
  const worldName = useGameStore((state) => state.worldName);
  const audio = useGameStore((state) => state.audio);
  const setAudio = useGameStore((state) => state.setAudio);
  const [page, setPage] = useState<Page>('main');

  const open = openPanel === 'menu' || openPanel === 'worlds';
  useEffect(() => {
    if (openPanel === 'worlds') setPage('worlds');
    else if (openPanel === 'menu') setPage('main');
  }, [openPanel]);

  if (!open) return null;
  const { title, emoji } = TITLES[page];

  return (
    <Sheet title={title} emoji={emoji} ariaLabel={page === 'main' ? 'Menu' : title} onClose={closePanels} onBack={page === 'main' ? undefined : () => setPage('main')} testId="menu">
      {page === 'main' && (
        <div className="menu-list">
          <KidButton tone="primary" className="menu-primary" onClick={closePanels} autoFocus>
            ▶️ Back to building
          </KidButton>
          <MenuRow tone="slate" emoji="❓" label="How to play" hint="Controls for keyboard, touch, and gamepad" onClick={() => setPage('help')} />
          <MenuRow tone="accent" emoji="🔨" label="Crafting" hint="Picture recipes to make things" onClick={() => setOpenPanel('crafting')} ariaLabel="Open crafting" />
          <MenuRow tone="pink" emoji="👕" label="Dress up" hint="Shirt, pants, hair, and a hat" onClick={() => setOpenPanel('dressup')} ariaLabel="Dress up your character" />
          <MenuRow tone="violet" emoji="🌈" label="World looks" hint="Visual mode, sky, and weather" onClick={() => setPage('looks')} />
          <MenuRow tone="teal" emoji="🔊" label="Sound" hint={audio.muted ? 'Muted' : audio.music ? 'Music and effects on' : 'Effects only'} onClick={() => setPage('sound')} />
          <MenuRow tone="primary" emoji="🌍" label="My worlds" hint={`Playing: ${worldName}`} onClick={() => setPage('worlds')} ariaLabel="See all your worlds" />
          <MenuRow tone="default" emoji="💾" label="Save & share" hint="Export and import world files" onClick={() => setPage('share')} />
          <MenuRow tone="danger" emoji="🔄" label="Start over" hint="Fresh meadow, Toy Land, or Sunny Town" onClick={() => setPage('reset')} />
          <MenuRow tone="slate" emoji="ℹ️" label="About" hint="Privacy and credits" onClick={() => setPage('about')} />
          <p className="menu-footer">
            {storageAvailable ? 'Your world is saved on this computer. Want to keep it forever? Export it!' : 'This browser cannot save — export your world to keep it!'}
          </p>
        </div>
      )}
      {page === 'help' && (
        <ul className="welcome-tips menu-help">
          <li>🚶 Walk with WASD or the arrow keys, jump with space, hold Ctrl to run</li>
          <li>👆 Tap the ground or a block to build; the green ghost shows where</li>
          <li>🧽 Use the Remove tool (or right-click) to take blocks away</li>
          <li>🖱️ Drag to look around, scroll (or the ➕ ➖ buttons, or pinch) to zoom, arrows or WASD to move</li>
          <li>👀 Press V (or zoom all the way in) to look through your own eyes</li>
          <li>🧱 Press E for all the blocks, C for crafting, and Undo if you make a mistake</li>
          <li>🎚️ Levers, buttons, and plates power wires, lamps, pistons, doors, and note blocks</li>
          <li>🤖 Tap a robot to give it a card program: forward, place, repeat…</li>
          <li>🛠️ The Tools button has Room, Fill, Paint, Copy, Paste, Mirror, and Blueprints</li>
          <li>🚪 Tap doors to open them, beds to sleep, chairs to sit, boxes to store treasures</li>
          <li>🐶 Find Friends & Rides in the block list: puppies, kitties, neighbors, a car and a boat</li>
          <li>🚗 Tap a car or boat to ride it, then tap it again (or press space) to hop off</li>
          <li>📱 On a phone: joystick to walk, Jump button, pinch to zoom</li>
          <li>🎮 Gamepad: sticks move and look, A jumps, RT builds, LT removes, D-pad right zooms, Start opens this menu</li>
          <li>🐰 The animals are just friends — they like watching you build</li>
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
          <p className="sheet-hint">Both of these replace the world you are playing now. You can export it first.</p>
          <ResetWorldDialog />
          <ResetWorldDialog preset="toyland" />
          <ResetWorldDialog preset="town" />
        </div>
      )}
      {page === 'about' && (
        <div className="menu-list about">
          <p>
            <strong>MindCraft 2.0</strong> is a creative block game made for a six-year-old. No accounts, no ads, no internet needed — everything stays on this device.
          </p>
          <p>No monsters, no health, no failing. Just building, animals, friends, and cozy nights.</p>
          <p>Original code and art, MIT licensed. Not affiliated with Minecraft, Mojang, Microsoft, Roblox, or The Sims.</p>
        </div>
      )}
    </Sheet>
  );
}
