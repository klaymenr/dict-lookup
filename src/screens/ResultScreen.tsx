import { motion } from 'framer-motion';
import { ActionButton } from '../components/ActionButton';
import styles from './ResultScreen.module.css';

interface Props {
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  targetScore: number;
  onPlayAgain: () => void;
  onBackHome: () => void;
}

export function ResultScreen({
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  targetScore,
  onPlayAgain,
  onBackHome,
}: Props) {
  const winner =
    player1Score === player2Score
      ? '平手！'
      : `${player1Score > player2Score ? player1Name : player2Name} 獲勝！`;

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>比賽結束！</h1>
      <p className={styles.subheading}>先答對 {targetScore} 個字的人獲勝</p>

      <div className={styles.scores}>
        {[
          { name: player1Name, score: player1Score, className: styles.playerA },
          { name: player2Name, score: player2Score, className: styles.playerB },
        ].map((player, index) => (
          <motion.div
            key={player.name}
            className={`${styles.card} ${player.className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <span className={styles.playerName}>{player.name}</span>
            <span className={styles.score}>{player.score}</span>
            <span className={styles.unit}>個字</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className={styles.winner}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        role="status"
      >
        {winner}
      </motion.p>

      <div className={styles.actions}>
        <ActionButton onClick={onPlayAgain} autoFocus>
          再玩一次
        </ActionButton>
        <ActionButton onClick={onBackHome} variant="secondary">
          回首頁
        </ActionButton>
      </div>
    </div>
  );
}
