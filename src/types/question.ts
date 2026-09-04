/** 生字表的年級：1-6 年級 */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

export const GRADES: Grade[] = [1, 2, 3, 4, 5, 6];

export interface Question {
  id: string;
  /** 題目國字，一題一個字 */
  character: string;
  /** 這個字在教育部各版本國小生字表裡是幾年級教的 */
  grade: Grade;
  /** 正確部首（取這個字裡看得見的那個寫法：湖 → 氵） */
  radical: string;
  /** 3 個部首選項，包含正確答案；錯的兩個也是這個字裡看得見的部件 */
  radicalChoices: string[];
  /** 唯一包含該國字的詞語 */
  correctWord: string;
  /** 3 個詞語選項，包含正確答案 */
  wordChoices: string[];
}
