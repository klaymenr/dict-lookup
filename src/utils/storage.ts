import type { DifficultyLevel, Settings } from '../types/game';

const STORAGE_KEY = 'dictionary-game-settings';

/** 結束條件：先答對幾個字就獲勝 */
export const TARGET_OPTIONS = [5, 10, 15, 20] as const;

export const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel; label: string; hint: string }> = [
  { value: 'normal', label: '普通', hint: '1-2 年級生字' },
  { value: 'hard', label: '挑戰', hint: '1-4 年級生字' },
  { value: 'hell', label: '地獄', hint: '1-6 年級生字' },
];

const DIFFICULTY_VALUES = DIFFICULTY_OPTIONS.map((option) => option.value);

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  targetScore: 10,
  difficulty: 'normal',
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
      targetScore: TARGET_OPTIONS.includes(parsed.targetScore as never)
        ? (parsed.targetScore as number)
        : DEFAULT_SETTINGS.targetScore,
      // 舊版的「簡單」已經沒有了（難度改成用生字表年級分），存到舊值就回到預設
      difficulty: DIFFICULTY_VALUES.includes(parsed.difficulty as DifficultyLevel)
        ? (parsed.difficulty as DifficultyLevel)
        : DEFAULT_SETTINGS.difficulty,
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
