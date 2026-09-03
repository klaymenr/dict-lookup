import type { Difficulty, Question } from './question';

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'finished';

export type QuestionStage = 'radical' | 'word';

export type FeedbackKind = 'none' | 'correct' | 'wrong';

export type PlayerId = 'player1' | 'player2';

export type MascotId = 'rabbit' | 'cat';

/** 難度分層：一局之內只出同一層，兩位玩家拿到的難度必定相同 */
export type DifficultyLevel = 'easy' | 'normal' | 'hard';

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
  /** 答對後短暫鎖住這一位玩家的輸入（不影響另一位） */
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

/** 每個難度實際會出到的題庫層級 */
export const DIFFICULTY_LEVELS: Record<DifficultyLevel, Difficulty[]> = {
  easy: [1], // 字本身就是部首（手、日、火⋯）
  normal: [2], // 形近字、同音字
  hard: [3], // 部首不明顯的字（教、影、島⋯）
};
