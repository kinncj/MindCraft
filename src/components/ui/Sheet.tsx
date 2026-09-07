import { useRef, type ReactNode } from 'react';
import { isTouchDevice } from '../../engine/input/touchInput';
import { IconButton } from './IconButton';
import { Icon, type IconName } from './icons';

type SheetProps = {
  title: string;
  emoji?: string;
  icon?: IconName;
  ariaLabel?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  /** `sheet` slides up from the bottom on phones; `dialog` is a centered card; `full` is the game menu; `chat` fills the screen on phones and pins its last child to the bottom. */
  kind?: 'sheet' | 'dialog' | 'full' | 'chat';
  hint?: string;
  testId?: string;
};

/**
 * The one container every panel uses: a bottom sheet on phones, a centered
 * card on larger screens, with a header row (back, title, close) and a
 * scrollable body.
 */
export function Sheet({ title, emoji, icon, ariaLabel, onClose, onBack, children, kind = 'sheet', hint, testId }: SheetProps) {
  // On touch screens the tap that opened the sheet still delivers a click a
  // moment later; if it lands on the backdrop it would close the sheet at once.
  const openedAt = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const guarded = useRef(isTouchDevice());
  return (
    <div
      className={`sheet-backdrop sheet-backdrop-${kind}`}
      role="presentation"
      onClickCapture={(event) => {
        // The tap that opened this sheet delivers its click a moment later, wherever the finger
        // was: on the backdrop it would close the sheet, on a button it would press it. Swallow
        // every click in the first moments so nothing happens without a deliberate second tap.
        if (guarded.current && typeof performance !== 'undefined' && performance.now() - openedAt.current < 450) {
          event.stopPropagation();
          event.preventDefault();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onClose();
      }}
    >
      <section className={`sheet sheet-${kind}`} role="dialog" aria-label={ariaLabel ?? title} aria-modal="true" data-testid={testId}>
        <header className="sheet-header">
          {onBack ? <IconButton icon="back" label="Back" onClick={onBack} className="sheet-back" /> : <span className="sheet-spacer" />}
          <h2 className="sheet-title">
            {icon ? <Icon name={icon} size={30} className="sheet-title-icon" /> : emoji ? <span aria-hidden="true">{emoji} </span> : null}
            {title}
          </h2>
          <IconButton icon="close" label={`Close ${title}`} onClick={onClose} className="sheet-close" />
        </header>
        {hint && <p className="sheet-hint">{hint}</p>}
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
