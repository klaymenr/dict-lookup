import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { QuestionStage } from '../types/game';
import styles from './ChoicePanel.module.css';

interface Props {
  /** 用來當作淡入淡出的 key：換階段或換題目都要重播動畫 */
  transitionKey: string;
  stage: QuestionStage;
  choices: string[];
  wrongChoices: string[];
  correctChoice: string | null;
  disabled: boolean;
  /** 答錯處罰中：整排選項變淡，讓玩家知道「現在按沒用，等一下」 */
  frozen: boolean;
  onSelect: (choice: string) => void;
}

const STAR_POSITIONS = [
  { top: '4%', left: '10%' },
  { top: '8%', right: '12%' },
  { bottom: '6%', left: '22%' },
];

export function ChoicePanel({
  transitionKey,
  stage,
  choices,
  wrongChoices,
  correctChoice,
  disabled,
  frozen,
  onSelect,
}: Props) {
  // 18. Multi-touch：用 pointerdown 直接反應，兩邊各自獨立，不會互相阻塞
  const handlePointerDown = (choice: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    onSelect(choice);
  };

  // 鍵盤操作（Enter / Space）產生的 click 沒有座標，detail 為 0
  const handleClick = (choice: string) => (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) onSelect(choice);
  };

  return (
    <div className={styles.panel}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={transitionKey}
          className={styles.row}
          initial={{ opacity: 0 }}
          // 答錯處罰中整排變淡：不用 grayscale，錯的紅框與 ✕ 要留著
          animate={{ opacity: frozen ? 0.45 : 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {choices.map((choice) => {
            const isWrong = wrongChoices.includes(choice);
            const isCorrect = correctChoice === choice;
            return (
              <motion.button
                key={choice}
                type="button"
                lang="zh-Hant"
                className={[
                  styles.choice,
                  stage === 'radical' ? styles.radical : styles.word,
                  isWrong ? styles.wrong : '',
                  isCorrect ? styles.correct : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={
                  stage === 'radical' ? `部首 ${choice}` : `詞語 ${choice}`
                }
                aria-pressed={isWrong || isCorrect}
                disabled={disabled || isWrong}
                onPointerDown={handlePointerDown(choice)}
                onClick={handleClick(choice)}
                variants={{
                  idle: { x: 0, scale: 1 },
                  wrong: { x: [0, -10, 10, -8, 8, 0], transition: { duration: 0.3 } },
                  correct: { scale: [1, 1.06, 1], transition: { duration: 0.35 } },
                }}
                animate={isWrong ? 'wrong' : isCorrect ? 'correct' : 'idle'}
              >
                {choice}
                {isWrong && (
                  <span className={styles.mark} aria-hidden="true">
                    ✕
                  </span>
                )}
                {isCorrect && (
                  <>
                    <span className={styles.mark} aria-hidden="true">
                      ✓
                    </span>
                    {STAR_POSITIONS.map((position, index) => (
                      <motion.span
                        key={index}
                        className={styles.star}
                        style={position}
                        aria-hidden="true"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.3, 1.15, 0.6] }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                      >
                        ✦
                      </motion.span>
                    ))}
                  </>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
