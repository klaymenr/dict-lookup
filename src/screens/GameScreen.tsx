import { AnimatePresence, motion } from 'framer-motion';
import { CountdownClock } from '../components/CountdownClock';
import { PlayerPanel } from '../components/PlayerPanel';
import type { PlayerId, PlayerState } from '../types/game';
import styles from './GameScreen.module.css';

interface Props {
  player1: PlayerState;
  player2: PlayerState;
  targetScore: number;
  remainingToWin: number;
  active: boolean;
  /** 3 / 2 / 1 / 0（開始！），null 表示不在倒數 */
  countdownValue: number | null;
  /** 有人達標時，中央先顯示「○○ 完成！」再進結果畫面 */
  finishedBanner: string | null;
  onSelect: (playerId: PlayerId, choice: string) => void;
}

export function GameScreen({
  player1,
  player2,
  targetScore,
  remainingToWin,
  active,
  countdownValue,
  finishedBanner,
  onSelect,
}: Props) {
  return (
    <div className={`${styles.screen} game`}>
      <PlayerPanel
        player={player1}
        target={targetScore}
        active={active}
        onSelect={(choice) => onSelect('player1', choice)}
      />

      <div className={styles.center}>
        <CountdownClock remaining={remainingToWin} target={targetScore} />
      </div>

      <PlayerPanel
        player={player2}
        target={targetScore}
        active={active}
        onSelect={(choice) => onSelect('player2', choice)}
      />

      <AnimatePresence>
        {countdownValue !== null && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              key={countdownValue}
              className={`${styles.overlayText} ${countdownValue === 0 ? styles.overlayGo : ''}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              role="status"
              aria-live="assertive"
            >
              {countdownValue === 0 ? '開始！' : countdownValue}
            </motion.span>
          </motion.div>
        )}

        {finishedBanner && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              className={styles.finished}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              role="status"
              aria-live="assertive"
            >
              {finishedBanner}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
