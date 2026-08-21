import { motion } from 'framer-motion';
import styles from './ScoreDisplay.module.css';

interface Props {
  name: string;
  score: number;
}

export function ScoreDisplay({ name, score }: Props) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.name}>{name}</span>
      <div className={styles.scoreBox}>
        <motion.span
          key={score}
          className={styles.score}
          initial={{ scale: 1 }}
          animate={{ scale: score > 0 ? [1, 1.35, 1] : 1 }}
          transition={{ duration: 0.35 }}
          aria-label={`${name} 得分 ${score} 分`}
        >
          {score}
        </motion.span>
        <span className={styles.unit} aria-hidden="true">
          分
        </span>
      </div>
    </div>
  );
}
