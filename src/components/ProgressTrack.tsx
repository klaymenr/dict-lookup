import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MascotId } from '../types/game';
import styles from './ProgressTrack.module.css';

const MASCOT_EMOJI: Record<MascotId, string> = {
  rabbit: '🐰',
  cat: '🐱',
};

/** 被超車後，跑道閃一下、自己那隻露出驚訝表情的時間 */
const OVERTAKE_MS = 900;
/** 還差幾個字開始轉成警示色 */
const WARNING_AT = 2;

interface Props {
  name: string;
  /** 這一位玩家的固定動物 */
  mascot: MascotId;
  score: number;
  /** 對手的分數：跑道上兩隻的距離就是領先／落後 */
  opponentScore: number;
  opponentMascot: MascotId;
  /** 這一局要先答對幾個字 */
  target: number;
  /** 遊戲進行中才播超車動畫，免得結算時在「○○ 完成！」底下亂閃 */
  active: boolean;
}

/** 這一位玩家看到的比賽狀況：一句話講完領先還是落後 */
function statusText(lead: number, remaining: number): string {
  if (remaining === 0) return '完成了！🎉';
  if (lead > 2) return `你大幅領先 ${lead} 個字！🔥`;
  if (lead > 0) return `你領先 ${lead} 個字，衝啊！🔥`;
  if (lead === 0) return '平手，看誰先找到！⚡';
  if (lead === -1) return '落後 1 個字，快追上去！💪';
  return `落後 ${-lead} 個字，別放棄！💪`;
}

/**
 * 每位玩家自己的跑道：一眼看出「我還差幾個字」跟「我跟對方差多少」，
 * 不用再去看中央的共用進度。兩隻小動物的距離就是差距。
 */
export function ProgressTrack({
  name,
  mascot,
  score,
  opponentScore,
  opponentMascot,
  target,
  active,
}: Props) {
  const remaining = Math.max(0, target - score);
  const lead = score - opponentScore;
  const percent = (value: number) => (target > 0 ? Math.min(1, value / target) * 100 : 0);

  // 被追過的那一刻做一次反應；只看分數變化，面板因為回饋重繪時不重播
  const [overtaken, setOvertaken] = useState(false);
  const previousLead = useRef(lead);
  useEffect(() => {
    const wasAhead = previousLead.current >= 0;
    previousLead.current = lead;
    if (!active || !wasAhead || lead >= 0) return;
    setOvertaken(true);
    const id = window.setTimeout(() => setOvertaken(false), OVERTAKE_MS);
    return () => window.clearTimeout(id);
  }, [score, opponentScore, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const warning = remaining > 0 && remaining <= WARNING_AT;

  return (
    <div className={styles.wrapper}>
      <div className={styles.top}>
        <span className={styles.name}>{name}</span>

        <div className={`${styles.track} ${overtaken ? styles.flash : ''}`}>
          <div className={styles.rail} aria-hidden="true" />
          {/* 對手畫在後面、小一點，主角是自己那隻 */}
          <motion.div
            className={`${styles.runner} ${styles.opponent}`}
            animate={{ left: `${percent(opponentScore)}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            aria-hidden="true"
          >
            {MASCOT_EMOJI[opponentMascot]}
          </motion.div>
          <motion.div
            className={`${styles.runner} ${styles.self}`}
            animate={{ left: `${percent(score)}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            aria-hidden="true"
          >
            <motion.span
              className={styles.runnerFace}
              key={score}
              initial={{ scale: 1 }}
              animate={{ scale: score > 0 ? [1, 1.45, 1] : 1, y: score > 0 ? [0, -6, 0] : 0 }}
              transition={{ duration: 0.4 }}
            >
              {overtaken ? '😮' : MASCOT_EMOJI[mascot]}
            </motion.span>
          </motion.div>
          <span className={styles.goal} aria-hidden="true">
            🏁
          </span>
        </div>

        <span className={`${styles.remaining} ${warning ? styles.warning : ''}`} aria-hidden="true">
          還差 <strong>{remaining}</strong>
        </span>
      </div>

      {/* 31. 不只靠顏色與位置：領先落後同時用文字說出來 */}
      <p className={styles.status} role="status" aria-live="polite">
        <span className="visually-hidden">
          {name}：還差 {remaining} 個字。
        </span>
        {statusText(lead, remaining)}
      </p>
    </div>
  );
}
