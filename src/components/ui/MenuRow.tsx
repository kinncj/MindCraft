import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';

type MenuRowProps = {
  icon?: IconName;
  emoji?: string;
  label: string;
  hint?: string;
  onClick: () => void;
  chevron?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'accent' | 'violet' | 'pink' | 'teal' | 'slate';
  ariaLabel?: string;
  trailing?: ReactNode;
};

/** A big game-menu button: icon badge, label, hint, chevron. */
export function MenuRow({ icon, emoji, label, hint, onClick, chevron = true, tone = 'default', ariaLabel, trailing }: MenuRowProps) {
  return (
    <button type="button" className={`menu-row menu-row-tone-${tone}`} onClick={onClick} aria-label={ariaLabel ?? label} onPointerUp={(event) => event.currentTarget.blur()}>
      <span className="menu-row-emoji" aria-hidden="true">
        {icon ? <Icon name={icon} size={30} /> : emoji}
      </span>
      <span className="menu-row-text">
        <span className="menu-row-label">{label}</span>
        {hint && <span className="menu-row-hint">{hint}</span>}
      </span>
      {trailing}
      {chevron && (
        <span className="menu-row-chevron" aria-hidden="true">
          <Icon name="back" size={26} style={{ transform: 'scaleX(-1)' }} />
        </span>
      )}
    </button>
  );
}
