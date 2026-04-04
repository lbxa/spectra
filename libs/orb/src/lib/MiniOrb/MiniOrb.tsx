import type { CSSProperties, ReactElement } from 'react';
import styles from './MiniOrb.module.css';

export interface MiniOrbProps {
  sizePx?: number;
  className?: string;
  excited?: boolean;
}

export function MiniOrb({ sizePx = 48, className, excited }: MiniOrbProps): ReactElement {
  const rootClassName = [styles.root, excited && styles.excited, className].filter(Boolean).join(' ');
  const style = { '--orb-size': `${sizePx}px` } as CSSProperties;

  return (
    <div className={rootClassName} style={style} aria-hidden="true">
      <div className={styles.atmo} />
      <div className={`${styles.spin} ${styles.spin1}`}>
        <div className={styles.ring} />
      </div>
      <div className={`${styles.spin} ${styles.spin2}`}>
        <div className={styles.ring2} />
      </div>
      <div className={`${styles.spin} ${styles.spin3}`}>
        <div className={styles.ring3} />
      </div>
      <div className={styles.center} />
      <div className={styles.warm} />
      <div className={styles.cool} />
    </div>
  );
}
