import { ActionButton } from '../components/ActionButton';
import type { Difficulty } from '../types/question';
import type { Settings } from '../types/game';
import { DURATION_OPTIONS } from '../utils/storage';
import styles from './SettingsScreen.module.css';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
}

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: 1, label: '簡單' },
  { value: 2, label: '普通' },
  { value: 3, label: '挑戰' },
];

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>設定</h1>

      <div className={styles.list}>
        <div className={styles.row}>
          <span className={styles.label} id="setting-sound">
            音效
          </span>
          <div className={styles.options} role="group" aria-labelledby="setting-sound">
            {[true, false].map((value) => (
              <button
                key={String(value)}
                type="button"
                className={`${styles.option} ${settings.soundEnabled === value ? styles.selected : ''}`}
                aria-pressed={settings.soundEnabled === value}
                onClick={() => onChange({ soundEnabled: value })}
              >
                {value ? 'ON' : 'OFF'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.label} id="setting-duration">
            遊戲時間
          </span>
          <div className={styles.options} role="group" aria-labelledby="setting-duration">
            {DURATION_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.option} ${settings.duration === value ? styles.selected : ''}`}
                aria-pressed={settings.duration === value}
                onClick={() => onChange({ duration: value })}
              >
                {value} 秒
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.label} id="setting-difficulty">
            難度
          </span>
          <div className={styles.options} role="group" aria-labelledby="setting-difficulty">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${settings.maxDifficulty === option.value ? styles.selected : ''}`}
                aria-pressed={settings.maxDifficulty === option.value}
                onClick={() => onChange({ maxDifficulty: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>最高分紀錄</span>
          <div className={styles.options}>
            <span className={styles.label}>{settings.bestScore} 分</span>
            <button type="button" className={styles.option} onClick={() => onChange({ bestScore: 0 })}>
              清除
            </button>
          </div>
        </div>
      </div>

      <p className={styles.note}>難度「簡單」只出錯誤選項差異明顯的題目；「挑戰」會加入形近字、同音字。</p>

      <ActionButton onClick={onBack} variant="secondary">
        回首頁
      </ActionButton>
    </div>
  );
}
