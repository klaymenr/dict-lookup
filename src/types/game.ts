import type { Grade, Question } from './question';

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'finished';

export type QuestionStage = 'radical' | 'word';

export type FeedbackKind = 'none' | 'correct' | 'wrong';

export type PlayerId = 'player1' | 'player2';

export type MascotId = 'rabbit' | 'cat';

/** 難度分層：用生字表的年級範圍分，兩位玩家在同一局裡拿到的是同一份牌 */
export type DifficultyLevel = 'normal' | 'hard' | 'hell';

export interface Feedback {
  kind: FeedbackKind;
  mascot: MascotId;
  message: string;
  /** 每次回饋都換一個新的 token，讓動畫可以重播 */
  token: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  /** 已經完整答對的字數 */
  score: number;
  question: Question;
  stage: QuestionStage;
  /**
   * 詞語階段用來遮住國字的 emoji。
   * 進入詞語階段時才抽，讓玩家必須自己記住剛才那個字。
   */
  wordEmoji: string;
  feedback: Feedback;
  /** 這一階段已經選錯的選項，用來保留紅框 */
  wrongChoices: string[];
  /** 剛選對、正在播放答對動畫的選項 */
  correctChoice: string | null;
  /**
   * 短暫鎖住這一位玩家的輸入（不影響另一位）。
   * 兩種情況：答對後播放動畫時，以及答錯後的 1 秒處罰。
   */
  locked: boolean;
}

export interface GameState {
  status: GameStatus;
  /** 這一局要先答對幾個字才獲勝 */
  targetScore: number;
  /** 先達標的玩家；未分出勝負時為 null */
  winner: PlayerId | null;
  player1: PlayerState;
  player2: PlayerState;
}

export interface Settings {
  soundEnabled: boolean;
  /** 結束條件：誰先答對這麼多個字就贏 */
  targetScore: number;
  difficulty: DifficultyLevel;
}

/**
 * 每個難度各年級生字的抽牌比重（不是題數，是抽到的機率權重）。
 * 三個難度都從 1 年級開始收，差別在重心壓在哪裡：
 * 地獄仍然出得到低年級字，只是七成以上會是 5、6 年級才教的。
 */
export const GRADE_MIX: Record<DifficultyLevel, Partial<Record<Grade, number>>> = {
  normal: { 1: 50, 2: 50 },
  hard: { 1: 15, 2: 25, 3: 30, 4: 30 },
  hell: { 1: 5, 2: 5, 3: 10, 4: 15, 5: 30, 6: 35 },
};
