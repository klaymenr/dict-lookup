import { motion } from 'framer-motion';
import { ActionButton } from '../components/ActionButton';
import type { Settings } from '../types/game';
import { DIFFICULTY_OPTIONS } from '../utils/storage';
import styles from './HomeScreen.module.css';

interface Props {
  settings: Settings;
  onStart: () => void;
  onOpenSettings: () => void;
}

export function HomeScreen({ settings, onStart, onOpenSettings }: Props) {
  const difficultyLabel = DIFFICULTY_OPTIONS.find((o) => o.value === settings.difficulty)?.label ?? '';

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
        <span>先答對 {settings.targetScore} 個字就獲勝</span>
        <span>難度 {difficultyLabel}</span>
        <span>音效 {settings.soundEnabled ? '開' : '關'}</span>
      </div>
    </div>
  );
}
