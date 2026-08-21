import { motion } from 'framer-motion';
import { ActionButton } from '../components/ActionButton';
import type { Settings } from '../types/game';
import styles from './HomeScreen.module.css';

interface Props {
  settings: Settings;
  onStart: () => void;
  onOpenSettings: () => void;
}

const DIFFICULTY_LABEL = ['', '簡單', '普通', '挑戰'];

export function HomeScreen({ settings, onStart, onOpenSettings }: Props) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>查字典大挑戰</h1>
      <p className={styles.subtitle}>先找部首，再找詞語</p>

      <div className={styles.mascots} aria-hidden="true">
        {['🐰', '🐱'].map((mascot, index) => (
          <motion.span
            key={mascot}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.4, ease: 'easeInOut' }}
          >
            {mascot}
          </motion.span>
        ))}
      </div>

      <div className={styles.actions}>
        <ActionButton onClick={onStart} block autoFocus>
          兩人開始比賽
        </ActionButton>
        <ActionButton onClick={onOpenSettings} variant="secondary" block>
          設定
        </ActionButton>
      </div>

      <div className={styles.meta}>
        <span>時間 {settings.duration} 秒</span>
        <span>難度 {DIFFICULTY_LABEL[settings.maxDifficulty]}</span>
        <span>音效 {settings.soundEnabled ? '開' : '關'}</span>
        <span>最高分 {settings.bestScore}</span>
      </div>
    </div>
  );
}
