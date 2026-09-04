// 發牌檢查：跑 `npm run check:deck`
// 直接載入 app 真正在用的 src/utils/deck.ts（Node 會自己去掉型別），
// 抽很多副牌來看年級比例、有沒有重複、牌夠不夠一局用。
import { existsSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// app 的 import 沒有寫副檔名（Vite 會補），Node 不會，所以這裡幫它補上 .ts
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts') && !specifier.endsWith('.json')) {
      const target = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(target)) return { url: target.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { buildDeck, deckSize } = await import('../src/utils/deck.ts');
const { GRADE_MIX } = await import('../src/types/game.ts');
const { TARGET_OPTIONS } = await import('../src/utils/storage.ts');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(readFileSync(resolve(root, 'src/data/questions.json'), 'utf8'));

const ROUNDS = 200;
const errors = [];

/**
 * 一局最多會發掉幾張牌：先發的兩張 + 每答對一個字補一張。
 * 贏家發到第 target 張時遊戲就結束，輸家最多停在 target 張，
 * 再加一張給「兩人拿到同一題」時的換牌（只可能發生在換新的一副牌時）。
 */
const maxCardsUsed = (target) => target * 2 + 1;

for (const [difficulty, mix] of Object.entries(GRADE_MIX)) {
  const seen = {};
  let cards = 0;
  for (let i = 0; i < ROUNDS; i += 1) {
    for (const target of TARGET_OPTIONS) {
      const deck = buildDeck(questions, difficulty, target);

      if (deck.length !== deckSize(target)) errors.push(`${difficulty}: 牌數 ${deck.length}，應該是 ${deckSize(target)}`);
      // 一局內不重複同一個國字，靠的是「牌一定夠用、中途不會重洗」
      if (deck.length < maxCardsUsed(target)) errors.push(`${difficulty}: ${target} 個字的一局可能會把牌發完（牌 ${deck.length} 張，最多用 ${maxCardsUsed(target)} 張）`);
      if (new Set(deck.map((q) => q.character)).size !== deck.length) errors.push(`${difficulty}: 同一副牌裡有重複的國字`);
      if (deck.some((q, index) => index > 0 && q.grade < deck[index - 1].grade)) errors.push(`${difficulty}: 沒有照年級由易到難排`);
      if (deck.some((q) => !(q.grade in mix))) errors.push(`${difficulty}: 出現了這個難度不該有的年級`);

      for (const q of deck) seen[q.grade] = (seen[q.grade] ?? 0) + 1;
      cards += deck.length;
    }
  }

  const actual = Object.entries(seen)
    .map(([grade, count]) => [grade, (count / cards) * 100])
    .sort((a, b) => a[0] - b[0]);
  const total = Object.values(mix).reduce((sum, w) => sum + w, 0);
  console.log(`${difficulty}：`);
  for (const [grade, percent] of actual) {
    const want = ((mix[grade] ?? 0) / total) * 100;
    const drift = percent - want;
    if (Math.abs(drift) > 4) errors.push(`${difficulty} ${grade} 年級：實際 ${percent.toFixed(1)}%，設定 ${want.toFixed(1)}%`);
    console.log(`  ${grade} 年級  設定 ${want.toFixed(0).padStart(2)}%  實際 ${percent.toFixed(1).padStart(5)}%`);
  }
}

if (errors.length) {
  console.error(`\n發現 ${errors.length} 個問題：`);
  for (const error of [...new Set(errors)]) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('\n發牌檢查通過。');
