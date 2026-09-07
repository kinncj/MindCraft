import type { ReactNode } from 'react';

type MenuRowProps = {
  emoji: string;
  label: string;
  hint?: string;
  onClick: () => void;
  chevron?: boolean;
  tone?: 'default' | 'primary' | 'danger';
  ariaLabel?: string;
  trailing?: ReactNode;
};

/** A tall list row: emoji, label, optional hint, chevron for submenus. */
export function MenuRow({ emoji, label, hint, onClick, chevron = true, tone = 'default', ariaLabel, trailing }: MenuRowProps) {
  return (
    <button type="button" className={`menu-row menu-row-${tone}`} onClick={onClick} aria-label={ariaLabel ?? label} onPointerUp={(event) => event.currentTarget.blur()}>
      <span className="menu-row-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="menu-row-text">
        <span className="menu-row-label">{label}</span>
        {hint && <span className="menu-row-hint">{hint}</span>}
      </span>
      {trailing}
      {chevron && (
        <span className="menu-row-chevron" aria-hidden="true">
          ›
        </span>
      )}
    </button>
  );
}
