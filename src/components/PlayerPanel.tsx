import { useMemo } from 'react';
import type { MascotId, PlayerState } from '../types/game';
import { shuffle } from '../utils/shuffle';
import { CharacterCard } from './CharacterCard';
import { ChoicePanel } from './ChoicePanel';
import { FeedbackMascot } from './FeedbackMascot';
import { ProgressTrack } from './ProgressTrack';
import styles from './PlayerPanel.module.css';

interface Props {
  player: PlayerState;
  /** 對手的分數與動物：跑道上要畫出兩個人的差距 */
  opponentScore: number;
  opponentMascot: MascotId;
  /** 這一局要先答對幾個字 */
  target: number;
  /** 遊戲進行中才能作答（倒數、結束時為 false） */
  active: boolean;
  /** 面對面版面時上方玩家整個轉 180 度 */
  flipped?: boolean;
  onSelect: (choice: string) => void;
}

export function PlayerPanel({
  player,
  opponentScore,
  opponentMascot,
  target,
  active,
  flipped = false,
  onSelect,
}: Props) {
  const { question, stage } = player;

  // 三個選項位置隨機；同一題同一階段內順序保持不變
  const choices = useMemo(
    () => shuffle(stage === 'radical' ? question.radicalChoices : question.wordChoices),
    [question.id, stage], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <section
      className={`${styles.panel} ${player.id === 'player1' ? styles.playerA : styles.playerB} ${
        active ? '' : styles.dimmed
      } ${flipped ? styles.flipped : ''}`}
      aria-label={`${player.name} 的作答區`}
    >
      {/* 尺寸都跟著這個面板自己的大小算（container query），
          所以 iPad 橫向、手機直向面對面、手機橫向共用同一套規則。
          cq 單位要在 container 的「子孫」上才會對到這個面板，因此 token 定義在 .inner。 */}
      <div className={styles.inner}>
        <ProgressTrack
          name={player.name}
          mascot={player.mascot}
          score={player.score}
          opponentScore={opponentScore}
          opponentMascot={opponentMascot}
          target={target}
          active={active}
        />
        <CharacterCard
          character={question.character}
          stage={stage}
          hiddenEmoji={player.wordEmoji}
          grade={question.grade}
        />
        <ChoicePanel
          transitionKey={`${question.id}-${stage}`}
          stage={stage}
          choices={choices}
          wrongChoices={player.wrongChoices}
          correctChoice={player.correctChoice}
          disabled={!active || player.locked}
          // locked 有兩種原因：答對動畫、答錯處罰。只有後者要把選項變淡。
          frozen={player.locked && player.feedback.kind === 'wrong'}
          onSelect={onSelect}
        />
        <FeedbackMascot feedback={player.feedback} />
      </div>
    </section>
  );
}
