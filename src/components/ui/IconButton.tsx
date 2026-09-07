import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icons';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** An icon from the set, or an emoji/text glyph as a fallback. */
  icon?: IconName;
  emoji?: string;
  /** Accessible name; also the visible text when `showLabel` is on. */
  label: string;
  showLabel?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'accent';
  size?: 'md' | 'lg';
  active?: boolean;
};

/** A round, thumb-sized button with a crisp icon. */
export function IconButton({ icon, emoji, label, showLabel = false, tone = 'default', size = 'md', active = false, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button icon-button-${tone} icon-button-${size} ${active ? 'icon-button-active' : ''} ${className ?? ''}`}
      aria-label={label}
      aria-pressed={rest['aria-pressed'] ?? (active || undefined)}
      onPointerUp={(event) => event.currentTarget.blur()}
      {...rest}
    >
      {icon ? (
        <Icon name={icon} size={size === 'lg' ? 34 : 28} />
      ) : (
        <span className="icon-button-glyph" aria-hidden="true">
          {emoji}
        </span>
      )}
      {showLabel && <span className="icon-button-label">{label}</span>}
    </button>
  );
}
