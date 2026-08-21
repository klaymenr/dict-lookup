import { useMemo } from 'react';
import type { PlayerState } from '../types/game';
import { shuffle } from '../utils/shuffle';
import { CharacterCard } from './CharacterCard';
import { ChoicePanel } from './ChoicePanel';
import { FeedbackMascot } from './FeedbackMascot';
import { ScoreDisplay } from './ScoreDisplay';
import styles from './PlayerPanel.module.css';

interface Props {
  player: PlayerState;
  /** 遊戲進行中才能作答（倒數、結束時為 false） */
  active: boolean;
  onSelect: (choice: string) => void;
}

export function PlayerPanel({ player, active, onSelect }: Props) {
  const { question, stage } = player;

  // 8. 三個選項位置隨機；同一題同一階段內順序保持不變
  const choices = useMemo(
    () => shuffle(stage === 'radical' ? question.radicalChoices : question.wordChoices),
    [question.id, stage], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <section
      className={`${styles.panel} ${player.id === 'player1' ? styles.playerA : styles.playerB} ${
        active ? '' : styles.dimmed
      }`}
      aria-label={`${player.name} 的作答區`}
    >
      <ScoreDisplay name={player.name} score={player.score} />
      <CharacterCard character={question.character} stage={stage} />
      <ChoicePanel
        transitionKey={`${question.id}-${stage}`}
        stage={stage}
        choices={choices}
        wrongChoices={player.wrongChoices}
        correctChoice={player.correctChoice}
        disabled={!active || player.locked}
        onSelect={onSelect}
      />
      <FeedbackMascot feedback={player.feedback} />
    </section>
  );
}
