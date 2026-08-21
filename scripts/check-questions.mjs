// 題庫品質檢查：跑 `npm run check:questions`
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/questions.json');
const questions = JSON.parse(readFileSync(file, 'utf8'));

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

  if (![1, 2, 3].includes(q.difficulty)) fail('difficulty 必須是 1 / 2 / 3');
  if (typeof q.grade !== 'number') fail('缺少 grade');

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
  }
}

const byDifficulty = questions.reduce((acc, q) => {
  acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
  return acc;
}, {});

console.log(`題數：${questions.length}`);
console.log(`難度分布：Level 1 = ${byDifficulty[1] ?? 0}，Level 2 = ${byDifficulty[2] ?? 0}，Level 3 = ${byDifficulty[3] ?? 0}`);
console.log(`不同部首：${new Set(questions.map((q) => q.radical)).size} 種`);

if (errors.length) {
  console.error(`\n發現 ${errors.length} 個問題：`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('\n✓ 題庫檢查通過');
