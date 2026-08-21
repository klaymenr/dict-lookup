export type Difficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  /** 題目國字，一題一個字 */
  character: string;
  /** 適用年級 */
  grade: number;
  difficulty: Difficulty;
  /** 正確部首 */
  radical: string;
  /** 3 個部首選項，包含正確答案 */
  radicalChoices: string[];
  /** 唯一包含該國字的詞語 */
  correctWord: string;
  /** 3 個詞語選項，包含正確答案 */
  wordChoices: string[];
}
