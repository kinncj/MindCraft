import type { ButtonHTMLAttributes, ReactNode } from 'react';

type KidButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'danger';
};

/** A big, rounded, friendly button. Every clickable thing uses this. */
export function KidButton({ children, tone = 'default', className, ...rest }: KidButtonProps) {
  return (
    <button
      type="button"
      className={`kid-button kid-button-${tone} ${className ?? ''}`}
      // Mouse/touch clicks drop focus so space and enter go back to the
      // game (jumping!) instead of re-firing the button. Keyboard focus
      // is untouched.
      onPointerUp={(event) => event.currentTarget.blur()}
      {...rest}
    >
      {children}
    </button>
  );
}
