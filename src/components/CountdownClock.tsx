import { motion } from 'framer-motion';
import styles from './CountdownClock.module.css';

interface Props {
  /** 剩餘秒數，只顯示數字（不顯示「秒」或 00:28） */
  seconds: number;
  /** 剩餘比例 0~1，外圈長度 */
  progress: number;
  label?: string;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownClock({ seconds, progress, label }: Props) {
  // 14.2 最後十秒改警示色、數字輕微 pulse（不強烈閃爍）
  const isWarning = seconds <= 10;

  return (
    <div className={styles.clock}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.track} cx="50" cy="50" r={RADIUS} strokeWidth="8" />
          <circle
            className={`${styles.progress} ${isWarning ? styles.warning : ''}`}
            cx="50"
            cy="50"
            r={RADIUS}
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))}
          />
        </svg>
        <motion.div
          className={`${styles.value} ${isWarning ? styles.valueWarning : ''}`}
          animate={isWarning ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={isWarning ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          role="timer"
          aria-live="off"
          aria-label={`剩餘 ${seconds} 秒`}
        >
          {seconds}
        </motion.div>
      </div>
      {label && <div className={styles.label}>{label}</div>}
    </div>
  );
}
