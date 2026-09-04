/**
 * 進全螢幕。
 *
 * 沒辦法「載入就自動全螢幕」——所有瀏覽器都要求使用者手勢，
 * 所以這個函式只在「開始」按鈕的 onClick 裡面同步呼叫。
 * 不支援的裝置（部分 iPhone Safari 版本）就當作沒發生，不影響遊戲。
 *
 * 也不去動螢幕方向：版面直向橫向都能玩，鎖方向只會跟使用者作對。
 * 想要完全沒有瀏覽器介面的話，「加入主畫面」啟動本來就是全螢幕。
 */
export function enterFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  if (document.fullscreenElement) return;

  try {
    if (typeof el.requestFullscreen === 'function') {
      void Promise.resolve(el.requestFullscreen()).catch(() => {});
    } else if (typeof el.webkitRequestFullscreen === 'function') {
      void Promise.resolve(el.webkitRequestFullscreen()).catch(() => {});
    }
  } catch {
    // 使用者拒絕或裝置不支援：維持原樣即可
  }
}
