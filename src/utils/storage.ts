import type { Settings } from '../types/game';

const STORAGE_KEY = 'dictionary-game-settings';

export const DURATION_OPTIONS = [30, 60, 90, 120] as const;

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  duration: 60,
  maxDifficulty: 2,
  bestScore: 0,
};

/** 只存遊戲設定，不存任何個人資料 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      duration: DURATION_OPTIONS.includes(parsed.duration as never)
        ? (parsed.duration as number)
        : DEFAULT_SETTINGS.duration,
      maxDifficulty:
        parsed.maxDifficulty === 1 || parsed.maxDifficulty === 2 || parsed.maxDifficulty === 3
          ? parsed.maxDifficulty
          : DEFAULT_SETTINGS.maxDifficulty,
      bestScore: typeof parsed.bestScore === 'number' && parsed.bestScore >= 0 ? parsed.bestScore : 0,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 隱私模式下寫入失敗就忽略，不影響遊戲進行
  }
}
