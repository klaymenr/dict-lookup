#!/usr/bin/env python3
"""用 data/ 的生字表與字形表產生題庫 src/data/questions.json。

  python3 scripts/build_questions.py

輸入（都是純文字 TSV，可以進 git 也看得懂 diff）：
  data/vocabulary.tsv  教育部各版本國小生字表：生字、年級、常見程度、同音旁字、教育部辭典雙字詞
  data/glyphs.tsv      每個字「看得見的部首寫法」與其他部件（Unihan + IDS 蒸餾）

出題邏輯：
  部首階段 選項＝正確部首 + 這個字裡「其他看得見的部件」（不是隨機部首，
           所以三個選項都真的在字裡面，考的是「哪一個才是部首」）。
  詞語階段 正確詞＝教育部辭典裡含這個字的雙字詞；
           錯誤選項＝同音旁字（形近／同音字）的詞，例如 湖 → 胡同、糊塗。
  兩個階段都湊不齊選項的字就不出題。
"""
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB = ROOT / 'data' / 'vocabulary.tsv'
GLYPHS = ROOT / 'data' / 'glyphs.tsv'
OUT = ROOT / 'src' / 'data' / 'questions.json'

# 選項湊不齊時用的常見部首（照小學部首表的常見順序）
COMMON_RADICALS = list('口木日手水人心火土女言金絲艸竹月目足貝力刀山田石車雨走食馬魚鳥')

# 每個年級最多出幾題：夠玩很多局就好，題庫檔案要留在 iPad 塞得下的大小
PER_GRADE = 200

random.seed(20260904)  # 固定亂數，重跑產生一樣的題庫


def read_tsv(path):
    rows = []
    for line in path.read_text(encoding='utf-8').splitlines():
        if line.startswith('#') or not line.strip():
            continue
        rows.append(line.split('\t'))
    return rows


def load():
    vocab = {}
    for row in read_tsv(VOCAB):
        row += [''] * (6 - len(row))
        ch, grade, freq, homophones, head, tail = row[:6]
        vocab[ch] = {
            'grade': int(grade),
            'freq': int(freq) if freq.isdigit() else 0,
            'homophones': list(homophones),
            'words': [w for w in (head.split(',') + tail.split(',')) if len(w) == 2],
        }
    glyphs = {}
    for row in read_tsv(GLYPHS):
        row += [''] * (4 - len(row))
        ch, radical, number, comps = row[:4]
        glyphs[ch] = {
            'radical': radical,
            'number': int(number) if number.isdigit() else 0,
            'comps': list(comps),
        }
    return vocab, glyphs


def pick_word(ch, vocab):
    """含這個字的雙字詞：優先另一個字也是小朋友學過、常見的"""
    entry = vocab[ch]
    best = None
    for word in entry['words']:
        if ch not in word:
            continue
        partner = word.replace(ch, '', 1)
        info = vocab.get(partner)
        # 排序鍵：另一個字的年級（沒學過的排後面）→ 詞在表中的順序（常見程度）
        rank = (info['grade'] if info else 9, entry['words'].index(word))
        if best is None or rank < best[0]:
            best = (rank, word)
    return best[1] if best else None


def pick_wrong_words(ch, vocab, glyphs):
    """錯誤詞語：先用同音旁字（形近／同音），不夠再退而求其次用同部首的字"""
    out = []
    weak = False

    def take(source_chars):
        for other in source_chars:
            if len(out) == 2:
                return
            info = vocab.get(other)
            if not info or other == ch:
                continue
            # 每個字的詞是照常見程度排的，取第一個能用的就是最常見的那個
            for word in info['words']:
                if ch in word or word in out:
                    continue
                out.append(word)
                break

    take(vocab[ch]['homophones'])
    if len(out) < 2:
        weak = True
        radical = glyphs[ch]['radical']
        take([c for c in vocab if c != ch and glyphs.get(c, {}).get('radical') == radical])
    return (out, weak) if len(out) == 2 else (None, weak)


def pick_wrong_radicals(ch, vocab, glyphs, known_radicals):
    """錯誤部首：先用這個字裡其他真的看得見的部件"""
    info = glyphs[ch]
    radical, number = info['radical'], info['number']
    out = []
    weak = False

    def ok(cand):
        return (
            cand != radical
            and cand != ch
            and cand not in out
            # 同一個部首的另一種寫法（水／氵）不能當錯誤選項，那樣沒有正確答案
            and glyphs.get(cand, {}).get('number') != number
            # 部件要嘛自己就是部首，要嘛是課本裡的生字；亼、丆、彖 這種只有大人看得懂
            # 的零件當選項，等於用「唯一看得懂的那個」就能猜到答案
            and (cand in known_radicals or cand in vocab)
        )

    for cand in info['comps']:
        if len(out) == 2:
            break
        if ok(cand):
            out.append(cand)
    if len(out) < 2:
        weak = True
        for cand in [glyphs.get(c, {}).get('radical') for c in vocab[ch]['homophones']]:
            if len(out) == 2:
                break
            if cand and ok(cand) and cand not in ch:
                out.append(cand)
    for cand in COMMON_RADICALS:
        if len(out) == 2:
            break
        if ok(cand) and cand not in ch:
            weak = True
            out.append(cand)
    return (out, weak) if len(out) == 2 else (None, weak)


def main():
    vocab, glyphs = load()
    known_radicals = {g['radical'] for g in glyphs.values() if g['radical']} | set(COMMON_RADICALS)
    candidates = defaultdict(list)
    skipped = Counter()

    for ch in sorted(vocab):
        glyph = glyphs.get(ch)
        if not glyph or not glyph['radical']:
            skipped['部首在字裡看不出來'] += 1
            continue
        word = pick_word(ch, vocab)
        if not word:
            skipped['找不到教育部辭典的雙字詞'] += 1
            continue
        wrong_words, w_weak = pick_wrong_words(ch, vocab, glyphs)
        if not wrong_words:
            skipped['湊不出兩個錯誤詞語'] += 1
            continue
        wrong_radicals, r_weak = pick_wrong_radicals(ch, vocab, glyphs, known_radicals)
        if not wrong_radicals:
            skipped['湊不出兩個錯誤部首'] += 1
            continue
        candidates[vocab[ch]['grade']].append({
            'weak': w_weak + r_weak,
            'freq': vocab[ch]['freq'],
            'question': {
                'character': ch,
                'grade': vocab[ch]['grade'],
                'radical': glyph['radical'],
                'radicalChoices': [glyph['radical']] + wrong_radicals,
                'correctWord': word,
                'wordChoices': [word] + wrong_words,
            },
        })

    # 每個年級只留 PER_GRADE 題：選項都來自同音旁／字內部件的（weak 小）先留，
    # 同樣品質再比常見程度，冷僻字自然被擠掉。
    chosen = []
    for grade in sorted(candidates):
        best = sorted(candidates[grade], key=lambda c: (c['weak'], -c['freq'], c['question']['character']))
        chosen += best[:PER_GRADE]

    questions = [item['question'] for item in chosen]
    questions.sort(key=lambda q: (q['grade'], q['character']))
    for index, q in enumerate(questions, start=1):
        q['id'] = f'q{index:04d}'

    # 一題一行：檔案小，git diff 也看得出改了哪一題
    body = ',\n'.join('  ' + json.dumps(q, ensure_ascii=False, separators=(',', ':')) for q in questions)
    OUT.write_text('[\n' + body + '\n]\n', encoding='utf-8')

    by_grade = Counter(q['grade'] for q in questions)
    weak_kept = sum(item['weak'] for item in chosen)
    print(f'產生 {len(questions)} 題（{OUT.stat().st_size // 1024} KB）'
          f'，候選 {sum(len(v) for v in candidates.values())} 題')
    print('各年級：' + '，'.join(f'{g} 年級 {by_grade[g]}' for g in sorted(by_grade)))
    print(f'品質：留下來的題目裡，選項用到退路（不是同音旁／字內部件）的共 {weak_kept} 處')
    for reason, count in skipped.most_common():
        print(f'略過：{reason} {count} 字')


if __name__ == '__main__':
    main()
