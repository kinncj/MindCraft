import type { SVGProps } from 'react';

/**
 * A small, bold icon set drawn in code (no assets). Two-tone rounded
 * shapes on a 24-unit grid so they stay crisp at any size. Every icon is
 * `aria-hidden`; the button carrying it provides the accessible name.
 */
export type IconName =
  | 'menu'
  | 'undo'
  | 'redo'
  | 'eye'
  | 'person'
  | 'plus'
  | 'minus'
  | 'sound'
  | 'mute'
  | 'close'
  | 'back'
  | 'tools'
  | 'place'
  | 'interact'
  | 'remove'
  | 'room'
  | 'fill'
  | 'paint'
  | 'copy'
  | 'paste'
  | 'mirror'
  | 'blueprint'
  | 'help'
  | 'craft'
  | 'shirt'
  | 'rainbow'
  | 'friends'
  | 'world'
  | 'save'
  | 'restart'
  | 'info'
  | 'play'
  | 'blocks'
  | 'chat'
  | 'send'
  | 'sparkle'
  | 'fly';

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

const paths: Record<IconName, JSX.Element> = {
  menu: (
    <>
      <rect x="3" y="5" width="18" height="3.4" rx="1.7" />
      <rect x="3" y="10.3" width="18" height="3.4" rx="1.7" />
      <rect x="3" y="15.6" width="18" height="3.4" rx="1.7" />
    </>
  ),
  undo: <path d="M9 6.5 3.8 11.2a1 1 0 0 0 0 1.5L9 17.5v-3.4h5a4.4 4.4 0 0 1 0 8.8h-1.5v3.2H14a7.6 7.6 0 0 0 0-15.2H9z" transform="translate(0 -3)" />,
  redo: <path d="M15 6.5l5.2 4.7a1 1 0 0 1 0 1.5L15 17.5v-3.4h-5a4.4 4.4 0 0 0 0 8.8h1.5v3.2H10a7.6 7.6 0 0 1 0-15.2h5z" transform="translate(0 -3)" />,
  eye: (
    <>
      <path d="M12 5C6.5 5 2.7 9.3 1.5 12c1.2 2.7 5 7 10.5 7s9.3-4.3 10.5-7C21.3 9.3 17.5 5 12 5z" />
      <circle cx="12" cy="12" r="3.6" fill="var(--icon-2)" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0z" />
    </>
  ),
  plus: <path d="M10.3 4h3.4v6.3H20v3.4h-6.3V20h-3.4v-6.3H4v-3.4h6.3z" />,
  minus: <rect x="4" y="10.3" width="16" height="3.4" rx="1.7" />,
  sound: (
    <>
      <path d="M4 9v6h3.5L13 19.5v-15L7.5 9z" />
      <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7M17.8 6a8 8 0 0 1 0 12" fill="none" stroke="var(--icon-2)" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9v6h3.5L13 19.5v-15L7.5 9z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="var(--icon-2)" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  close: <path d="M6.2 4 12 9.8 17.8 4 20 6.2 14.2 12l5.8 5.8-2.2 2.2L12 14.2 6.2 20 4 17.8 9.8 12 4 6.2z" />,
  back: <path d="M14.5 4.5 7 12l7.5 7.5 2.3-2.3L11.6 12l5.2-5.2z" />,
  tools: (
    <>
      <path d="M14.7 3.3a5 5 0 0 0-5.4 6.9L3 16.5V21h4.5l6.3-6.3a5 5 0 0 0 6.9-5.4l-3 3-2.8-.7-.7-2.8z" />
    </>
  ),
  place: (
    <>
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" fill="var(--icon-2)" />
      <path d="M12 12v9.5L4 17V7z" />
      <path d="M12 2.5V12L4 7z" opacity=".6" />
    </>
  ),
  interact: (
    <>
      <path d="M8.5 20.5c-2 0-4-1.7-4.5-4L3 11.5a1.6 1.6 0 0 1 3.1-.8l.8 3V4.3a1.6 1.6 0 0 1 3.2 0V11h.9V3.1a1.6 1.6 0 0 1 3.2 0V11h.9V4.8a1.6 1.6 0 0 1 3.2 0V11h.9V7.6a1.6 1.6 0 0 1 3.2 0V15c0 3.5-2.4 5.5-5.5 5.5z" />
    </>
  ),
  remove: (
    <>
      <rect x="3" y="12" width="18" height="8" rx="2" />
      <path d="M6 12V6.5A2.5 2.5 0 0 1 8.5 4h7A2.5 2.5 0 0 1 18 6.5V12" fill="var(--icon-2)" />
    </>
  ),
  room: (
    <>
      <path d="M3 11 12 3l9 8v10H3z" fill="var(--icon-2)" />
      <path d="M9 21v-7h6v7z" />
    </>
  ),
  fill: (
    <>
      <path d="M4 10 10 4l8 8-6 6z" fill="var(--icon-2)" />
      <path d="M4 10h14l-6 6z" />
      <path d="M19 13c1.5 2 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2 2-4z" />
    </>
  ),
  paint: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.3 0 2-.8 2-1.8 0-.6-.3-1-.6-1.5-.4-.6-.4-1.7.9-1.7H16a5 5 0 0 0 5-5c0-4.5-4-8-9-8z" fill="var(--icon-2)" />
      <circle cx="7.5" cy="10.5" r="1.6" />
      <circle cx="11" cy="7" r="1.6" />
      <circle cx="15.5" cy="8.5" r="1.6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <rect x="4" y="3" width="12" height="13" rx="2" fill="var(--icon-2)" />
    </>
  ),
  paste: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" fill="var(--icon-2)" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M8 11h8v2H8zm0 4h6v2H8z" />
    </>
  ),
  mirror: (
    <>
      <path d="M11 3h2v18h-2z" opacity=".6" />
      <path d="M9 6v12l-6-6z" fill="var(--icon-2)" />
      <path d="M15 6v12l6-6z" />
    </>
  ),
  blueprint: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="var(--icon-2)" />
      <path d="M7 8h10v2H7zm0 4h6v2H7zm0 4h8v2H7z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" fill="var(--icon-2)" />
      <path d="M12 6.5c-2.4 0-4 1.5-4 3.5h2.4c0-.9.7-1.5 1.6-1.5s1.6.6 1.6 1.4c0 1.5-2.8 1.6-2.8 4.1h2.4c0-1.5 2.8-1.9 2.8-4.3 0-1.9-1.6-3.2-4-3.2zM10.8 15.5h2.4V18h-2.4z" />
    </>
  ),
  craft: (
    <>
      <path d="M3 17.5 13.5 7l3.5 3.5L6.5 21z" fill="var(--icon-2)" />
      <path d="M13 3l8 8-2.5 2.5-8-8z" />
    </>
  ),
  shirt: (
    <>
      <path d="M8 3 5 5 2 9l3 2v10h14V11l3-2-3-4-3-2c0 1.5-1.5 3-4 3S8 4.5 8 3z" fill="var(--icon-2)" />
      <path d="M8 3c0 1.5 1.5 3 4 3s4-1.5 4-3z" />
    </>
  ),
  rainbow: (
    <>
      <path d="M2 18a10 10 0 0 1 20 0h-3a7 7 0 0 0-14 0z" />
      <path d="M5 18a7 7 0 0 1 14 0h-3a4 4 0 0 0-8 0z" fill="var(--icon-2)" />
    </>
  ),
  friends: (
    <>
      <circle cx="8" cy="8" r="3.5" />
      <circle cx="16.5" cy="9" r="3" fill="var(--icon-2)" />
      <path d="M2 20a6 6 0 0 1 12 0z" />
      <path d="M13 20a5 5 0 0 1 9 0z" fill="var(--icon-2)" />
    </>
  ),
  world: (
    <>
      <circle cx="12" cy="12" r="10" fill="var(--icon-2)" />
      <path d="M7 6c2 0 3 2 2 4s-3 2-3 4 2 3 4 3 1-3 3-3 3 1 5 0c1.5-.8 1-3 0-4s-3-1-3-3 1-3 3-3a10 10 0 0 0-11 2z" />
    </>
  ),
  save: (
    <>
      <path d="M4 4h13l3 3v13H4z" fill="var(--icon-2)" />
      <path d="M7 4h8v5H7z" />
      <rect x="7" y="13" width="10" height="5" rx="1" />
    </>
  ),
  restart: (
    <>
      <path d="M12 4a8 8 0 1 0 7.7 10h-3.2A5 5 0 1 1 12 7v3l5-4.5L12 1z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" fill="var(--icon-2)" />
      <path d="M10.8 10h2.4v8h-2.4zM12 5.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z" />
    </>
  ),
  play: <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" />,
  blocks: (
    <>
      <rect x="3" y="12" width="8" height="8" rx="1.5" />
      <rect x="13" y="12" width="8" height="8" rx="1.5" fill="var(--icon-2)" />
      <rect x="8" y="3" width="8" height="8" rx="1.5" fill="var(--icon-2)" />
    </>
  ),
  chat: (
    <>
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="var(--icon-2)" />
      <circle cx="8" cy="10.5" r="1.4" />
      <circle cx="12" cy="10.5" r="1.4" />
      <circle cx="16" cy="10.5" r="1.4" />
    </>
  ),
  send: <path d="M3 11 21 3l-6 18-3-8z" />,
  fly: (
    <>
      <path d="M12 4c-1.2 0-2 .9-2 2v3.2L3.5 13v2l6.5-2v3.2l-2 1.3V19l4-1 4 1v-1.5l-2-1.3V13l6.5 2v-2L14 9.2V6c0-1.1-.8-2-2-2z" />
      <path d="M11 6h2v3h-2z" fill="var(--icon-2)" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
      <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" fill="var(--icon-2)" />
    </>
  ),
};

export function Icon({ name, size = 24, className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`ui-icon ${className ?? ''}`} aria-hidden="true" focusable="false" fill="currentColor" {...rest}>
      {paths[name]}
    </svg>
  );
}
