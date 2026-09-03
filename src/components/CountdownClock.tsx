import { motion } from 'framer-motion';
import styles from './CountdownClock.module.css';

interface Props {
  /** 領先者距離獲勝還差幾個字（只顯示數字） */
  remaining: number;
  /** 這一局的目標字數，用來算外圈長度 */
  target: number;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 中央的「還剩下幾個字」：外圈會隨著比賽接近結束而縮短 */
export function CountdownClock({ remaining, target }: Props) {
  const progress = target > 0 ? Math.max(0, Math.min(1, remaining / target)) : 0;
  // 剩最後兩個字時轉成警示色並輕微 pulse（不強烈閃爍）
  const isWarning = remaining <= 2;

  return (
    <div className={styles.clock}>
      <div className={styles.label}>還剩下</div>
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
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <motion.div
          className={`${styles.value} ${isWarning ? styles.valueWarning : ''}`}
          animate={isWarning ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={isWarning ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          role="status"
          aria-live="off"
          aria-label={`還剩下 ${remaining} 個字就完成`}
        >
          {remaining}
        </motion.div>
      </div>
      <div className={styles.label}>個字</div>
    </div>
  );
}
