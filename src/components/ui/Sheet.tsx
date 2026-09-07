import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

type SheetProps = {
  title: string;
  emoji?: string;
  ariaLabel?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  /** `sheet` slides up from the bottom on phones; `dialog` is a centered card. */
  kind?: 'sheet' | 'dialog';
  hint?: string;
  testId?: string;
};

/**
 * The one container every panel uses: a bottom sheet on phones, a centered
 * card on larger screens, with a header row (back, title, close) and a
 * scrollable body. Focus and labels are consistent everywhere.
 */
export function Sheet({ title, emoji, ariaLabel, onClose, onBack, children, kind = 'sheet', hint, testId }: SheetProps) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`sheet sheet-${kind}`} role="dialog" aria-label={ariaLabel ?? title} aria-modal="true" data-testid={testId}>
        <header className="sheet-header">
          {onBack ? <IconButton emoji="‹" label="Back" onClick={onBack} className="sheet-back" /> : <span className="sheet-spacer" />}
          <h2 className="sheet-title">
            {emoji && <span aria-hidden="true">{emoji} </span>}
            {title}
          </h2>
          <IconButton emoji="✕" label={`Close ${title}`} onClick={onClose} className="sheet-close" />
        </header>
        {hint && <p className="sheet-hint">{hint}</p>}
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
