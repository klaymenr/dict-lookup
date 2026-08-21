import { AnimatePresence, motion } from 'framer-motion';
import { CountdownClock } from '../components/CountdownClock';
import { PlayerPanel } from '../components/PlayerPanel';
import type { PlayerId, PlayerState } from '../types/game';
import styles from './GameScreen.module.css';

interface Props {
  player1: PlayerState;
  player2: PlayerState;
  seconds: number;
  timerProgress: number;
  active: boolean;
  /** 3 / 2 / 1 / 0（開始！），null 表示不在倒數 */
  countdownValue: number | null;
  showTimeUp: boolean;
  onSelect: (playerId: PlayerId, choice: string) => void;
}

export function GameScreen({
  player1,
  player2,
  seconds,
  timerProgress,
  active,
  countdownValue,
  showTimeUp,
  onSelect,
}: Props) {
  return (
    <div className={`${styles.screen} game`}>
      <PlayerPanel player={player1} active={active} onSelect={(choice) => onSelect('player1', choice)} />

      <div className={styles.center}>
        <CountdownClock seconds={seconds} progress={timerProgress} />
      </div>

      <PlayerPanel player={player2} active={active} onSelect={(choice) => onSelect('player2', choice)} />

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

        {showTimeUp && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              className={styles.timeUp}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              role="status"
              aria-live="assertive"
            >
              時間到！
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
