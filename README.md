# 查字典大挑戰 Dictionary Race

適合國小二年級的**雙人查字典競賽遊戲**。兩個人共用一台 iPad（橫向），
左右各占半邊畫面，同時作答，比誰先答對 N 個字。

訓練重點：

1. 辨識國字部首
2. 從候選詞中找出包含指定國字的正確詞語
3. 熟悉「先找部首，再確認字詞」的查字典流程

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
npm run typecheck        # TypeScript 型別檢查
npm run check:questions   # 題庫品質檢查（部首、詞語、重複字…）
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

一局之內只出同一層的題目，所以兩位玩家拿到的難度必定相同：

| 設定 | 題庫層級 | 內容 | 題數 |
| --- | --- | --- | --- |
| 簡單 | Level 1 | 含「字本身就是部首」的送分題（手、日、火⋯） | 29 |
| 普通（預設） | Level 2 | 形近字、同音字（湖泊／胡同／糊塗） | 63 |
| 挑戰 | Level 3 | 部首不明顯的字（教、影、島、鄉、醫⋯） | 43 |

> 「簡單」只有 29 題，兩人打到 20 個字的一局會用完題庫並重新洗牌，
> 這時同一個國字有機會再出現一次。普通與挑戰都夠一局用。

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

`src/data/questions.json`，135 題（Level 1：29、Level 2：63、Level 3：43，共 59 種部首）。

```json
{
  "id": "q001",
  "character": "湖",
  "grade": 2,
  "difficulty": 2,
  "radical": "氵",
  "radicalChoices": ["氵", "木", "口"],
  "correctWord": "湖泊",
  "wordChoices": ["湖泊", "胡同", "糊塗"]
}
```

規則：

- `wordChoices` 中**只有** `correctWord` 包含 `character`。
- 錯誤選項盡量有迷惑性（同音字、形近字、常見混淆字），但不超出小二程度。
- 難度：Level 1 送分題（字本身就是部首）；Level 2 形近／音近；Level 3 部首不明顯。
  設定頁的「簡單／普通／挑戰」各自對應一層，不累加。
- 「字本身就是部首」的題目（手、日、火⋯）等於直接找出一樣的字，
  檢查腳本會強制它們標成 Level 1，不會混進普通與挑戰。

新增題目後跑 `npm run check:questions`，會檢查 id 與國字是否重複、
部首是否在選項內、正確詞是否含該字、錯誤選項是否誤含該字、
「字本身就是部首」是否標在 Level 1，並提醒哪一層題數不夠一局用。

出題規則：一局內不重複同一個國字；左右玩家不會同時拿到同一題；
題目依難度由易到難發牌，所以兩邊拿到的難度相近。

## 專案結構

```
src/
├── components/    ScoreDisplay / CharacterCard / ChoicePanel / FeedbackMascot
│                  PlayerPanel / CountdownClock / ActionButton
├── screens/       HomeScreen / GameScreen / ResultScreen / SettingsScreen
├── hooks/         useGame（遊戲邏輯與勝負判定）
├── data/          questions.json
├── types/         game.ts / question.ts
├── utils/         audio.ts / storage.ts / shuffle.ts / emoji.ts
└── styles/        global.css（色彩、字級、觸控尺寸等 token）
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
