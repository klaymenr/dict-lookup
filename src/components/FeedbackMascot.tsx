import { AnimatePresence, motion } from 'framer-motion';
import type { Feedback } from '../types/game';
import styles from './FeedbackMascot.module.css';

const MASCOT_EMOJI = {
  rabbit: '🐰',
  cat: '🐱',
} as const;

const MASCOT_NAME = {
  rabbit: '小兔子',
  cat: '小貓咪',
} as const;

interface Props {
  feedback: Feedback;
}

export function FeedbackMascot({ feedback }: Props) {
  const visible = feedback.kind !== 'none';
  return (
    <div className={styles.area}>
      {/* 31. 回饋同時用文字說明，不只靠顏色 */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key={feedback.token}
            className={`${styles.bubble} ${feedback.kind === 'wrong' ? styles.wrong : styles.correct}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
          >
            <span className={styles.mascot} aria-hidden="true">
              {MASCOT_EMOJI[feedback.mascot]}
            </span>
            <span className={styles.message}>
              <span className="visually-hidden">{MASCOT_NAME[feedback.mascot]}說：</span>
              {feedback.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
