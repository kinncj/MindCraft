import type { ButtonHTMLAttributes, ReactNode } from 'react';

type KidButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'danger';
};

/** A big, rounded, friendly button. Every clickable thing uses this. */
export function KidButton({ children, tone = 'default', className, ...rest }: KidButtonProps) {
  return (
    <button type="button" className={`kid-button kid-button-${tone} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
