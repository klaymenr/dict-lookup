# 查字典大挑戰 Dictionary Race

國小 1-6 年級的**雙人查字典競賽遊戲**（難度可調）。兩個人共用一台 iPad（橫向），
左右各占半邊畫面，同時作答，比誰先答對 N 個字。

訓練重點：

1. 辨識國字部首
2. 從候選詞中找出包含指定國字的正確詞語
3. 熟悉「先找部首，再確認字詞」的查字典流程

題目來自教育部各版本國小 1-6 年級生字表，卡片上會標這個字是幾年級教的。
純前端、無帳號、無後端、無網路連線需求；加入主畫面後可離線遊玩。

## 快速開始

```bash
npm install
npm run dev       # 開發（預設 http://localhost:5173）
npm run build     # 產生 dist/ 靜態檔案
npm run preview   # 預覽 build 結果
```

其他指令：

```bash
npm run typecheck         # TypeScript 型別檢查
npm run check:questions   # 題庫品質檢查（部首、詞語、重複字…）
npm run check:deck        # 發牌檢查（各難度的年級比例、有沒有重複；需要 Node 22+）
npm run icons             # 重新產生 PWA icon
```

## 玩法

```
顯示國字 → 選部首 → 答對 → 國字被 emoji 遮住、換成候選詞語 → 選詞語 → 答對 → 完成 1 個字 → 下一題
```

- 一題兩階段，**部首 + 詞語都答對才算完成 1 個字**（只選對部首不算）。
- **選詞語時看不到國字**：原本的國字會被一個隨機 emoji（🐸 🦄 🍩⋯）遮住，
  玩家必須自己記得剛才那個字是什麼，不能照著字面挑詞。
- 答錯**不換題**：錯的選項留下紅框與 ✕、輕微晃動，小兔子／小貓咪出來提示。
- 答錯後**停 1 秒才能再作答**（該邊選項變淡、提示泡泡在畫面上就是計時器），
  避免玩家不會查就無腦連點把答案試出來。處罰只鎖答錯的那一位，另一位照常作答。
- 兩位玩家的題目、階段、回饋完全獨立，一邊答錯不會擋住另一邊；
  **只有中央的「還剩下幾個字」是共用的**。
- **沒有時間限制**：結束條件是「誰先答對 N 個字」，預設 10 個（可設 5 / 10 / 15 / 20）。
  中央顯示領先者距離獲勝還差幾個字，外圈跟著縮短，剩最後 2 個字時轉成警示色。
- 有人達標 → 中央顯示「○○ 完成！」→ 結果畫面（成績、勝負、再玩一次 / 回首頁）。

## 技術

React 18 + TypeScript + Vite，CSS Modules，Framer Motion，Web Audio API，
LocalStorage，PWA（自寫 Service Worker）。沒有使用 Canvas 遊戲引擎，
整個畫面都是 HTML DOM，方便處理中文字、按鈕與 iPad 觸控。

### iPad 相關處理

- 固定橫向；直向時顯示「請把 iPad 轉成橫向」提示。
- **Multi-touch**：選項用 `onPointerDown` 直接反應，左右兩邊各自獨立，
  兩根手指同時按下時兩邊都會作答（已用 CDP 多點觸控測試驗證）。
- `touch-action: manipulation`、`user-select: none`、擋掉 `gesturestart`，
  避免長按選字、雙擊放大與手勢誤判。
- 選項按鈕高度 72–120 px，符合兒童觸控。
- 版面用 responsive layout（`clamp()` + vh/vw），沒有寫死任何 iPad 尺寸；
  基準解析度 1366 × 1024。

### 難度分層

難度用**生字表的年級**分。三個難度都從 1 年級開始收，差別在重心壓在哪一段
（下表是抽牌的機率權重，不是題數）：

| 設定 | 年級範圍 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 普通（預設） | 1-2 年級 | 50% | 50% | | | | |
| 挑戰 | 1-4 年級 | 15% | 25% | 30% | 30% | | |
| 地獄 | 1-6 年級 | 5% | 5% | 10% | 15% | 30% | 35% |

一局開始時依權重抽一副牌（抽走不放回，所以一局內不會重複同一個字），
再照年級由易到難發出去；兩位玩家拿到的是相鄰的題目，難度自然相近。
牌數只比一局會用到的多幾張，免得地獄的 5、6 年級全排在牌尾、整局都沒發到。

`npm run check:deck` 會直接載入 app 在用的 `src/utils/deck.ts`（Node 22+ 可以直接跑 .ts），
對 4 種目標字數各抽 200 副牌，檢查比例、有沒有重複的字，
以及「牌一定夠一局用」——牌不會在中途發完，才不會重洗牌又出到同一個字。

### 音效

第一版沒有附上 mp3，音效由 Web Audio API 即時合成（離線也有聲音）。
若要改用真實音檔，把 `answer-correct.mp3`、`answer-wrong.mp3`、`countdown.mp3`、
`game-start.mp3`、`game-end.mp3` 放進 `public/sounds/`，程式會自動優先使用，
並記得把檔名加進 `public/sw.js` 的 `PRECACHE_PATHS`。
設定頁可切換音效 ON / OFF（預設 ON）。

### 離線 / PWA

`npm run build` 後的 `dist/` 可直接部署到 Cloudflare Pages / Vercel / GitHub Pages
（`vite.config.ts` 的 `base: './'` 讓子路徑部署也能運作）。
Service Worker 會 precache 程式碼、題庫與 icon，加入主畫面後可全螢幕、離線遊玩。

> Service Worker 只在正式版（`import.meta.env.PROD`）註冊，開發時不會干擾 HMR。

## 題庫

`src/data/questions.json`，1200 題（每個年級 200 題，共 162 種部首），
由 `scripts/build_questions.py` 從教育部生字表產生，不是手寫的。
卡片上會標這個字是幾年級教的。

```json
{
  "id": "q0001",
  "character": "湖",
  "grade": 3,
  "radical": "氵",
  "radicalChoices": ["氵", "胡", "月"],
  "correctWord": "湖泊",
  "wordChoices": ["湖泊", "胡同", "糊塗"]
}
```

規則：

- `wordChoices` 中**只有** `correctWord` 包含 `character`，三個詞長度一樣
  （長度不同的話光看形狀就知道答案）。
- 錯誤詞語取**同音旁字**的詞（湖 → 胡同、糊塗），也就是形近字與同音字。
- 錯誤部首取**這個字裡其他真的看得見的部件**，所以三個選項都在字裡面，
  考的是「哪一個才是部首」，不是「哪一個看起來像部首」。
- 部首取這個字裡看得見的寫法（湖 → 氵）；部首在字裡看不出來的字
  （為、街、鄉⋯）直接不出題，否則正確答案會變成「唯一沒出現過的選項」。

### 資料與產生方式

| 檔案 | 內容 |
| --- | --- |
| `data/vocabulary.tsv` | 教育部各版本國小生字表（南一／康軒／翰林統整）：生字、年級、常見程度、同音旁字、教育部辭典雙字詞 |
| `data/glyphs.tsv` | 每個字「看得見的部首寫法」與其他部件，由 Unihan `kRSUnicode` + CHISE/cjkvi IDS 拆字表推出 |
| `data/curated-radicals.tsv` | 舊版 135 題手工題庫的部首答案，當回歸測試的基準 |

```bash
python3 scripts/build_questions.py   # 產生 src/data/questions.json（只有標準函式庫）
npm run check:questions              # 題庫品質檢查
npm run check:deck                   # 發牌比例檢查
```

`check:questions` 會檢查 id 與國字是否重複、年級是否在 1-6、部首是否在選項內、
正確詞是否含該字、錯誤選項是否誤含該字或長度不一致，
並拿 `data/curated-radicals.tsv` 對照手工題庫的部首答案（目前 76 個字全部一致）。

品質上的已知取捨：2994 個生字裡，96 個因為部首在字裡看不出來、
66 個因為教育部辭典沒有合適的雙字詞、36 個因為湊不出錯誤選項而不出題；
留下的 1200 題中有 226 個選項不是取自同音旁字或字內部件，
而是退而求其次用同部首的詞或常見部首（`build_questions.py` 每次都會印出這個數字）。

出題規則：一局內不重複同一個國字；左右玩家不會同時拿到同一題；
題目依年級由易到難發牌，所以兩邊拿到的難度相近。

## 專案結構

```
src/
├── components/    ScoreDisplay / CharacterCard / ChoicePanel / FeedbackMascot
│                  PlayerPanel / CountdownClock / ActionButton
├── screens/       HomeScreen / GameScreen / ResultScreen / SettingsScreen
├── hooks/         useGame（遊戲邏輯與勝負判定）
├── data/          questions.json（由 scripts/build_questions.py 產生）
├── types/         game.ts / question.ts
├── utils/         deck.ts（依難度抽牌）/ audio.ts / storage.ts / shuffle.ts / emoji.ts
└── styles/        global.css（色彩、字級、觸控尺寸等 token）
data/              題庫的來源資料（生字表、字形、回歸測試基準）
scripts/           build_questions.py / check-questions.mjs / check-deck.mjs / generate-icons.mjs
```

`useGame` 以一個 ref 當作唯一真實狀態來源，所有副作用（音效、setTimeout）
都在 React updater 之外，因此在 StrictMode 下不會重複觸發。

## LocalStorage

只存遊戲設定，不存任何個人資料。鍵值：`dictionary-game-settings`
（音效、目標字數、難度）。

> 原本的「歷史最高分」已移除：改成競速制之後，贏家的分數永遠等於目標字數，記錄下來沒有意義。

## 無障礙

- 所有可點擊元素都是 `<button>`，不使用假按鈕。
- 顏色不是唯一提示：答錯有紅框 + ✕ + 晃動 + 角色文字；答對有綠框 + ✓ + 星星 + 音效。
- 回饋區有 `aria-live`，鍵盤（Enter / Space）也能作答，`:focus-visible` 有明顯外框。
- 支援 `prefers-reduced-motion`。

## 第一版不做

帳號、雲端同步、排行榜、多人連線、AI 出題、語音辨識、老師後台、
班級管理、Firebase／資料庫／WebSocket／Server API。
