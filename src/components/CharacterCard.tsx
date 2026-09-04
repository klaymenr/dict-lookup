import { motion } from 'framer-motion';
import type { QuestionStage } from '../types/game';
import styles from './CharacterCard.module.css';

interface Props {
  character: string;
  stage: QuestionStage;
  /** 詞語階段用來遮住國字的 emoji */
  hiddenEmoji: string;
  /** 這個字在生字表裡是幾年級教的 */
  grade: number;
}

export function CharacterCard({ character, stage, hiddenEmoji, grade }: Props) {
  const isWordStage = stage === 'word';

  return (
    <div className={styles.card}>
      <span className={styles.hint}>
        {isWordStage ? '剛才那個字，在哪個詞裡？' : '這個字的部首是？'}
      </span>
      {/* 藏字階段一樣佔著位子（visibility），不然整張卡片會上下跳 */}
      <span className={styles.grade} aria-hidden={isWordStage} data-hidden={isWordStage}>
        {grade} 年級的字
      </span>
      <motion.span
        // 換題或換階段都重播一次淡入
        key={isWordStage ? `emoji-${character}` : character}
        className={isWordStage ? styles.emoji : styles.character}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        lang={isWordStage ? undefined : 'zh-Hant'}
        // 詞語階段要靠自己記住是哪個字，所以不把答案透露給輔助技術
        aria-label={isWordStage ? '剛才那個國字被藏起來了' : `國字 ${character}`}
        role="img"
      >
        {isWordStage ? hiddenEmoji : character}
      </motion.span>
    </div>
  );
}
