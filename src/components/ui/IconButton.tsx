import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  emoji: string;
  /** Accessible name; also the visible text when `showLabel` is on. */
  label: string;
  showLabel?: boolean;
  tone?: 'default' | 'primary' | 'danger';
  size?: 'md' | 'lg';
  active?: boolean;
};

/** A round, thumb-sized button with an emoji glyph. */
export function IconButton({ emoji, label, showLabel = false, tone = 'default', size = 'md', active = false, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button icon-button-${tone} icon-button-${size} ${active ? 'icon-button-active' : ''} ${className ?? ''}`}
      aria-label={label}
      aria-pressed={rest['aria-pressed'] ?? (active || undefined)}
      onPointerUp={(event) => event.currentTarget.blur()}
      {...rest}
    >
      <span className="icon-button-glyph" aria-hidden="true">
        {emoji}
      </span>
      {showLabel && <span className="icon-button-label">{label}</span>}
    </button>
  );
}
