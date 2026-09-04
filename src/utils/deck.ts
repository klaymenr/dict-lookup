import type { DifficultyLevel } from '../types/game';
import { GRADE_MIX } from '../types/game';
import type { Question } from '../types/question';
import { shuffle } from './shuffle';

/**
 * 一局要發幾張牌：兩個人加起來最多用掉 targetScore × 2 題，
 * 多備幾張給「兩人同時拿到同一題」時換牌用。牌不夠時會再洗一副新的。
 */
export function deckSize(targetScore: number): number {
  return targetScore * 2 + 6;
}

/**
 * 依難度的年級比重抽一副牌。
 *
 * 抽走不放回，所以一局之內不會重複同一個國字；抽完再照年級由易到難排，
 * 兩位玩家拿到的是相鄰的題目，難度自然相近。
 * 牌數只比實際會用到的多一點點，才不會把重心（例如地獄的 5、6 年級）
 * 都排在牌尾、整局都沒發到。
 */
export function buildDeck(
  questions: Question[],
  difficulty: DifficultyLevel,
  targetScore: number,
): Question[] {
  const groups = Object.entries(GRADE_MIX[difficulty]).map(([grade, weight]) => ({
    weight: weight as number,
    questions: shuffle(questions.filter((q) => q.grade === Number(grade))),
  }));

  const deck: Question[] = [];
  const size = deckSize(targetScore);
  while (deck.length < size) {
    const available = groups.filter((group) => group.questions.length > 0);
    if (available.length === 0) break;
    const total = available.reduce((sum, group) => sum + group.weight, 0);
    let roll = Math.random() * total;
    const picked = available.find((group) => (roll -= group.weight) <= 0) ?? available[0];
    deck.push(picked.questions.pop() as Question);
  }
  return deck.sort((a, b) => a.grade - b.grade);
}
