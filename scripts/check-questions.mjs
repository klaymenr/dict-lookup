// 題庫品質檢查：跑 `npm run check:questions`
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(readFileSync(resolve(root, 'src/data/questions.json'), 'utf8'));

const errors = [];
const seenIds = new Set();
const seenChars = new Set();

for (const q of questions) {
  const where = `${q.id ?? '(無 id)'} ${q.character ?? ''}`;
  const fail = (msg) => errors.push(`${where}: ${msg}`);

  if (!q.id) fail('缺少 id');
  else if (seenIds.has(q.id)) fail('id 重複');
  else seenIds.add(q.id);

  if (!q.character || [...q.character].length !== 1) fail('character 必須是單一國字');
  else if (seenChars.has(q.character)) fail('國字重複出現在題庫中');
  else seenChars.add(q.character);

  if (![1, 2, 3, 4, 5, 6].includes(q.grade)) fail('grade 必須是 1-6（生字表年級）');

  if (!Array.isArray(q.radicalChoices) || q.radicalChoices.length !== 3) fail('radicalChoices 必須是 3 個');
  else {
    if (new Set(q.radicalChoices).size !== 3) fail('radicalChoices 有重複');
    if (!q.radicalChoices.includes(q.radical)) fail(`正確部首 ${q.radical} 不在 radicalChoices 中`);
  }

  if (!Array.isArray(q.wordChoices) || q.wordChoices.length !== 3) fail('wordChoices 必須是 3 個');
  else {
    if (new Set(q.wordChoices).size !== 3) fail('wordChoices 有重複');
    if (!q.wordChoices.includes(q.correctWord)) fail(`correctWord ${q.correctWord} 不在 wordChoices 中`);
    if (q.correctWord && !q.correctWord.includes(q.character)) fail(`correctWord ${q.correctWord} 不含指定國字`);
    const wrongContaining = q.wordChoices.filter((w) => w !== q.correctWord && w.includes(q.character));
    if (wrongContaining.length) fail(`錯誤選項 ${wrongContaining.join('、')} 也包含指定國字`);
    // 三個詞長度要一樣，不然光看長短就知道答案
    if (new Set(q.wordChoices.map((w) => [...w].length)).size !== 1) fail('三個詞語長度不一致');
  }
}

// 回歸測試：舊版手工題庫的部首答案是人工確認過的，產生器不該推翻它們
const fixture = readFileSync(resolve(root, 'data/curated-radicals.tsv'), 'utf8')
  .split('\n')
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split('\t'));
const byChar = new Map(questions.map((q) => [q.character, q]));
const mismatched = [];
let checked = 0;
for (const [character, accepted] of fixture) {
  const q = byChar.get(character);
  if (!q) continue;
  checked += 1;
  if (!accepted.split('|').includes(q.radical)) {
    mismatched.push(`${character}: 手工題庫是 ${accepted.split('|')[0]}，現在的題庫是 ${q.radical}`);
  }
}
for (const line of mismatched) errors.push(`部首與手工題庫不一致 → ${line}`);

const byGrade = questions.reduce((acc, q) => {
  acc[q.grade] = (acc[q.grade] ?? 0) + 1;
  return acc;
}, {});

console.log(`題數：${questions.length}`);
console.log(
  `各年級：${[1, 2, 3, 4, 5, 6].map((g) => `${g} 年級 ${byGrade[g] ?? 0}`).join('，')}`,
);
console.log(`可出題數：普通（1-2）= ${(byGrade[1] ?? 0) + (byGrade[2] ?? 0)}，挑戰（1-4）= ${
  [1, 2, 3, 4].reduce((sum, g) => sum + (byGrade[g] ?? 0), 0)
}，地獄（1-6）= ${questions.length}`);
console.log(`不同部首：${new Set(questions.map((q) => q.radical)).size} 種`);
console.log(
  `與手工題庫對照：${checked} 個字，${mismatched.length ? `${mismatched.length} 個不一致（見下）` : '全部一致'}`,
);

if (errors.length) {
  console.error(`\n發現 ${errors.length} 個問題：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('\n題庫檢查通過。');
