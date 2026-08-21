import type { Difficulty, Question } from './question';

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'finished';

export type QuestionStage = 'radical' | 'word';

export type FeedbackKind = 'none' | 'correct' | 'wrong';

export type PlayerId = 'player1' | 'player2';

export type MascotId = 'rabbit' | 'cat';

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
  score: number;
  question: Question;
  stage: QuestionStage;
  feedback: Feedback;
  /** 這一階段已經選錯的選項，用來保留紅框 */
  wrongChoices: string[];
  /** 剛選對、正在播放答對動畫的選項 */
  correctChoice: string | null;
  /** 答對後短暫鎖住這一位玩家的輸入（不影響另一位） */
  locked: boolean;
}

export interface GameState {
  status: GameStatus;
  /** 剩餘秒數（顯示用，無條件進位） */
  timeRemaining: number;
  player1: PlayerState;
  player2: PlayerState;
}

export interface Settings {
  soundEnabled: boolean;
  /** 一局的秒數 */
  duration: number;
  /** 最高難度，題庫會取 difficulty <= maxDifficulty */
  maxDifficulty: Difficulty;
  /** 單人最高分紀錄 */
  bestScore: number;
}
