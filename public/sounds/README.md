# 音效

第一版沒有附上音檔，遊戲會用 Web Audio API 即時合成下列音效，
所以離線時一樣有聲音、也不需要額外下載資源。

若要換成真正的音檔，把同名 mp3 放進這個資料夾即可，程式會自動優先使用：

- `answer-correct.mp3` — 答對
- `answer-wrong.mp3` — 答錯
- `countdown.mp3` — 倒數 tick
- `game-start.mp3` — 遊戲開始
- `game-end.mp3` — 遊戲結束

放進音檔後，記得把檔名加進 `public/sw.js` 的 `PRECACHE_PATHS`，離線才會有聲音。
