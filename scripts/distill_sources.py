#!/usr/bin/env python3
"""把三份大檔蒸餾成 data/ 底下可以進 git 的兩個 TSV（一次性，只用標準函式庫）。

  python3 scripts/distill_sources.py <生字表.xlsx> <Unihan_IRGSources.txt> <ids.txt>

三份輸入都不進 repo（太大、二進位、外部授權），要重跑時自己抓：
  生字表  教育部「115/114 各版本國小生字表」xlsx，讀其中的「統整」工作表
  Unihan  https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip 解開的 Unihan_IRGSources.txt
  IDS     https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt

部首怎麼判：Unihan 的 kRSUnicode 給部首號，再從 IDS 拆字結果裡找出這個部首
「在這個字裡實際看得到的寫法」（水部在 湖 裡寫成 氵）。找不到就留白不出題——
部首在字裡看不出來的字（為、街、鄉⋯），正確答案會變成唯一沒出現過的選項。
"""
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

IDC2 = '⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻'  # 兩個組件的組字符
IDC3 = '⿲⿳'  # 三個組件的組字符

# CHISE IDS 會用「CJK Radicals Supplement」區的字，換成一般看到的寫法
NORMALIZE = {'⺼': '月', '⺊': '卜', '⺀': '冫', '⺌': '小', '⺆': '冂'}
# cjkvi 用 ①②③ 當「拆不出來的部分」的佔位符
PLACEHOLDER = {chr(c) for c in range(0x2460, 0x2500)}

# 只有台灣部首表會單獨教、字形也明顯不同的變體才拿來當答案顯示；
# 其餘（訁、糹、𧾷、⺮⋯）一律回到正體，避免小孩沒看過或字體缺字。
VARIANT_ALLOWLIST = set('亻刂氵氺忄扌犭艹辶阝礻衤王月灬罒攵')

# 部首的各種偏旁寫法。大部分 Unihan 自己就有「部首號.0」的條目，
# 這裡補的是查不到的（月當肉部、左右阝、㣺 當心部⋯）。
EXTRA_VARIANTS = {
    9: ['亻'],
    18: ['刂'],
    61: ['忄', '㣺'],  # 心（想、慕）
    64: ['扌'],
    85: ['氵', '氺'],
    86: ['灬'],
    94: ['犭'],
    96: ['王'],        # 玉 → 王（球、現）
    113: ['礻'],
    120: ['糹'],
    122: ['罒'],
    125: ['耂'],
    130: ['月'],       # 肉 → 月（肝、腳）
    140: ['艹'],
    145: ['衤'],
    149: ['訁'],
    162: ['辶'],
    163: ['阝'],       # 邑 → 右阝（都、部）
    167: ['釒'],
    170: ['阝'],       # 阜 → 左阝（陽、院）
    184: ['飠'],
}

# 康熙部首表收的是舊字形，台灣課本寫的是另一個
STANDARD_OVERRIDE = {174: '青'}

WORD_KEEP = 6
HOMOPHONE_KEEP = 8

# 統整工作表的欄位位置
C_CHAR, C_FREQ, C_GRADE = 0, 1, 3
C_HOM_IN, C_HOM_OUT = 9, 10
C_HEAD_EDU, C_TAIL_EDU = 11, 13


# --- xlsx（zip + xml，不裝套件） -------------------------------------------

def read_sheet(xlsx_path, sheet_name):
    with zipfile.ZipFile(xlsx_path) as zf:
        workbook = ET.fromstring(zf.read('xl/workbook.xml'))
        sheets = workbook.findall(f'.//{NS}sheet')
        index = next(i for i, s in enumerate(sheets, start=1) if s.get('name') == sheet_name)
        strings = [''.join(t.text or '' for t in si.iter(NS + 't'))
                   for si in ET.fromstring(zf.read('xl/sharedStrings.xml')).findall(NS + 'si')]
        sheet = ET.fromstring(zf.read(f'xl/worksheets/sheet{index}.xml'))

    for row in sheet.iter(NS + 'row'):
        cells = {}
        for c in row.findall(NS + 'c'):
            value = c.find(NS + 'v')
            if c.get('t') == 'inlineStr':
                text = ''.join(x.text or '' for x in c.iter(NS + 't'))
            elif value is None:
                text = ''
            elif c.get('t') == 's':
                text = strings[int(value.text)]
            else:
                text = value.text or ''
            if text.strip():
                letters = re.match(r'[A-Z]+', c.get('r')).group(0)
                column = 0
                for ch in letters:
                    column = column * 26 + (ord(ch) - 64)
                cells[column - 1] = text.strip()
        if cells:
            yield [cells.get(i, '') for i in range(max(cells) + 1)]


# --- Unihan / IDS -----------------------------------------------------------

def load_unihan(path):
    """char -> (部首號, 部首外筆畫)"""
    out = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        parts = line.split('\t')
        if len(parts) != 3 or parts[1] != 'kRSUnicode':
            continue
        first = parts[2].strip().split()[0]  # 可能是 "85.9" 或 "85'.9"
        extra = first.split('.')[-1]
        out[chr(int(parts[0][2:], 16))] = (int(re.match(r'(\d+)', first).group(1)),
                                           int(extra) if extra.isdigit() else 0)
    return out


def load_ids(path):
    """char -> IDS 拆字字串（優先取台灣／通用寫法那一欄）"""
    out = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if line.startswith('#'):
            continue
        parts = line.split('\t')
        if len(parts) < 3:
            continue
        best = None
        for column in parts[2:]:
            tag = re.search(r'\[([A-Z]+)\]$', column)
            body = re.sub(r'\[[A-Z]+\]$', '', column).strip('^$')
            if tag is None:
                best = best or body
            elif 'T' in tag.group(1):
                best = body
                break
        if best:
            out[parts[1]] = ''.join(NORMALIZE.get(c, c) for c in best)
    return out


def take_one(s):
    """從 IDS 字串前面切下一個完整的組件，回傳 (組件, 剩下的)"""
    if not s:
        return '', ''
    head = s[0]
    if head in IDC2 + IDC3:
        rest = s[1:]
        used = head
        for _ in range(3 if head in IDC3 else 2):
            chunk, rest = take_one(rest)
            used += chunk
        return used, rest
    return head, s[1:]


def top_components(ids):
    """IDS 最上層的組件（⿰氵胡 → ['氵', '胡']）：小朋友一眼看得到的那一層"""
    if not ids or ids[0] not in IDC2 + IDC3:
        return [ids] if ids else []
    rest = ids[1:]
    out = []
    for _ in range(3 if ids[0] in IDC3 else 2):
        if not rest:
            break
        chunk, rest = take_one(rest)
        out.append(chunk)
    return out


def components_of(ids, ids_map, ch):
    """由淺到深三層的單字組件：越前面越明顯"""
    top = [c for c in top_components(ids) if len(c) == 1 and c not in PLACEHOLDER]
    nested = []
    for comp in top_components(ids):
        if len(comp) > 1:
            nested += [c for c in top_components(comp) if len(c) == 1 and c not in PLACEHOLDER]
    shallow = list(dict.fromkeys(top + nested))
    deeper = []
    for comp in shallow:
        for sub in top_components(ids_map.get(comp, '')):
            if len(sub) == 1 and sub != comp and sub != ch and sub not in PLACEHOLDER:
                deeper.append(sub)
    return top, shallow, list(dict.fromkeys(deeper))


def radical_forms(unihan):
    """部首號 -> 這個部首所有可能的寫法（Unihan 裡「部首外筆畫 0」的字 + 手動補的變體）"""
    forms = defaultdict(list)
    for ch, (num, extra) in unihan.items():
        if extra == 0 and len(ch) == 1:
            forms[num].append(ch)
    for num, extra in EXTRA_VARIANTS.items():
        for form in extra:
            if form not in forms[num]:
                forms[num].append(form)
    return forms


def standard_form(num, candidates):
    """這個部首的正體寫法（康熙部首表那個字）"""
    if num in STANDARD_OVERRIDE:
        return STANDARD_OVERRIDE[num]
    std = unicodedata.normalize('NFKC', chr(0x2F00 + num - 1))
    if len(std) == 1 and 0x4E00 <= ord(std) <= 0x9FFF:
        return std
    common = [c for c in candidates if 0x4E00 <= ord(c) <= 0x9FFF]
    return min(common, key=ord) if common else ''


def radical_of(ch, unihan, ids_map, forms):
    """回傳 (看得見的部首寫法, 這個字裡其他部件)；判不出來就 (None, 部件)"""
    if ch not in unihan:
        return None, []
    num = unihan[ch][0]
    ids = ids_map.get(ch, '')
    top, shallow, deeper = components_of(ids, ids_map, ch)
    candidates = forms.get(num, [])
    if ch in candidates:  # 字本身就是部首（日、手、火）
        return ch, []
    # 變體排前面，但只有 VARIANT_ALLOWLIST 裡的才會真的拿來顯示
    ordered = sorted(candidates, key=lambda f: 0 if f in VARIANT_ALLOWLIST else 1)
    for pool in (top, shallow, deeper):
        for form in ordered:
            if form in pool:
                shown = form if form in VARIANT_ALLOWLIST else standard_form(num, candidates) or form
                others = [c for c in shallow + deeper if c != form and c != shown]
                return shown, others
    return None, shallow + deeper


# --- 產生 TSV ---------------------------------------------------------------

def parse_items(cell):
    """'湖泊(6),胡同(5)' -> [('湖泊', 6), ('胡同', 5)]"""
    return [(m.group(1).strip(), int(m.group(2))) for m in re.finditer(r'([^,()]+)\((\d)\)', cell or '')]


def main(argv):
    if len(argv) != 4:
        print(__doc__)
        return 1
    xlsx, unihan_path, ids_path = argv[1:]

    rows = list(read_sheet(xlsx, '統整'))[1:]
    unihan = load_unihan(unihan_path)
    ids_map = load_ids(ids_path)
    forms = radical_forms(unihan)

    def cell(row, i):
        return row[i] if len(row) > i else ''

    seen = set()
    vocab, shapes = [], []
    for row in rows:
        ch = cell(row, C_CHAR)
        grade = cell(row, C_GRADE)
        if len(ch) != 1 or ch in seen or not grade.isdigit():
            continue
        seen.add(ch)

        head = [w for w, _ in parse_items(cell(row, C_HEAD_EDU)) if len(w) == 2][:WORD_KEEP]
        tail = [w for w, _ in parse_items(cell(row, C_TAIL_EDU)) if len(w) == 2][:WORD_KEEP]
        homophones = [c for c, _ in parse_items(cell(row, C_HOM_IN)) + parse_items(cell(row, C_HOM_OUT))
                      if len(c) == 1][:HOMOPHONE_KEEP]
        vocab.append([ch, grade, cell(row, C_FREQ), ''.join(homophones), ','.join(head), ','.join(tail)])

        radical, others = radical_of(ch, unihan, ids_map, forms)
        others = [c for c in others if 0x4E00 <= ord(c) <= 0x9FFF or c in VARIANT_ALLOWLIST]
        shapes.append([ch, radical or '', str(unihan.get(ch, ('', ''))[0]), ''.join(dict.fromkeys(others))])

    write(ROOT / 'data' / 'vocabulary.tsv', vocab, [
        f'# 來源：教育部「各版本國小生字表」統整工作表（{Path(xlsx).name}）',
        '# 由 scripts/distill_sources.py 產生',
        '# 欄位：生字\t年級\t常見程度(1-6，6最常見)\t同音旁字\t字首雙字詞(教育部辭典)\t字尾雙字詞(教育部辭典)',
    ])
    write(ROOT / 'data' / 'glyphs.tsv', shapes, [
        '# 來源：Unihan kRSUnicode（unicode.org）+ CHISE/cjkvi IDS 拆字表',
        '# 由 scripts/distill_sources.py 產生',
        '# 欄位：生字\t看得見的部首寫法（空白＝部首在字裡看不出來，不出題）\t康熙部首號\t其他部件',
    ])
    print(f'vocabulary.tsv {len(vocab)} 字，glyphs.tsv {len(shapes)} 字，'
          f'其中判得出部首 {sum(1 for r in shapes if r[1])} 字')
    return 0


def write(path, rows, header):
    path.write_text('\n'.join(header + ['\t'.join(r) for r in rows]) + '\n', encoding='utf-8')


if __name__ == '__main__':
    sys.exit(main(sys.argv))
