import { motion } from 'framer-motion';
import styles from './ScoreDisplay.module.css';

interface Props {
  name: string;
  score: number;
  /** 要先答對幾個字才獲勝 */
  target: number;
}

export function ScoreDisplay({ name, score, target }: Props) {
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
          aria-label={`${name} 已完成 ${score} 個字，目標 ${target} 個`}
        >
          {score}
        </motion.span>
        <span className={styles.target} aria-hidden="true">
          / {target}
        </span>
        <span className={styles.unit} aria-hidden="true">
          個
        </span>
      </div>
    </div>
  );
}
