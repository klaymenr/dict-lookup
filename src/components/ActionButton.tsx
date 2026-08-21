import type { ReactNode } from 'react';
import styles from './ActionButton.module.css';

interface Props {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  block?: boolean;
  autoFocus?: boolean;
}

export function ActionButton({ children, onClick, variant = 'primary', block, autoFocus }: Props) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      className={[styles.button, styles[variant], block ? styles.block : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
