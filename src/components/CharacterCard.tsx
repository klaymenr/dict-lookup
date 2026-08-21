import { motion } from 'framer-motion';
import type { QuestionStage } from '../types/game';
import styles from './CharacterCard.module.css';

interface Props {
  character: string;
  stage: QuestionStage;
}

export function CharacterCard({ character, stage }: Props) {
  return (
    <div className={styles.card}>
      <span className={styles.hint}>{stage === 'radical' ? '這個字的部首是？' : '哪個詞裡有這個字？'}</span>
      <motion.span
        key={character}
        className={styles.character}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        lang="zh-Hant"
      >
        {character}
      </motion.span>
    </div>
  );
}
