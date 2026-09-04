import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayerPanel } from '../components/PlayerPanel';
import type { PlayerId, PlayerState } from '../types/game';
import styles from './GameScreen.module.css';

interface Props {
  player1: PlayerState;
  player2: PlayerState;
  targetScore: number;
  active: boolean;
  /** 3 / 2 / 1 / 0（開始！），null 表示不在倒數 */
  countdownValue: number | null;
  /** 有人達標時先顯示「○○ 完成！」再進結果畫面 */
  finishedBanner: string | null;
  onSelect: (playerId: PlayerId, choice: string) => void;
}

/**
 * 倒數與「○○ 完成！」印兩份：面對面版面時上下各一份，
 * 兩位玩家都看得到正的字（橫向時上面那份用 CSS 藏起來）。
 */
function MirroredOverlay({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 上方玩家看的那一份：內容重複，不重複報讀 */}
      <div className={styles.overlayMirror} aria-hidden="true">
        {children}
      </div>
      <div className={styles.overlayMain}>{children}</div>
    </motion.div>
  );
}

export function GameScreen({
  player1,
  player2,
  targetScore,
  active,
  countdownValue,
  finishedBanner,
  onSelect,
}: Props) {
  return (
    <div className={`${styles.screen} game`}>
      {/* 面對面（直向）時 A 在上方並轉 180 度；橫向時就是原本的左右分割 */}
      <PlayerPanel
        player={player1}
        opponentScore={player2.score}
        opponentMascot={player2.mascot}
        target={targetScore}
        active={active}
        flipped
        onSelect={(choice) => onSelect('player1', choice)}
      />

      <PlayerPanel
        player={player2}
        opponentScore={player1.score}
        opponentMascot={player1.mascot}
        target={targetScore}
        active={active}
        onSelect={(choice) => onSelect('player2', choice)}
      />

      <AnimatePresence>
        {countdownValue !== null && (
          <MirroredOverlay key="countdown">
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
          </MirroredOverlay>
        )}

        {finishedBanner && (
          <MirroredOverlay key="finished">
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
          </MirroredOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}
