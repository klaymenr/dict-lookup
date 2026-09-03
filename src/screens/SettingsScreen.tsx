import { ActionButton } from '../components/ActionButton';
import type { Settings } from '../types/game';
import { DIFFICULTY_OPTIONS, TARGET_OPTIONS } from '../utils/storage';
import styles from './SettingsScreen.module.css';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
}

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
          <span className={styles.label} id="setting-target">
            先答對幾個字獲勝
          </span>
          <div className={styles.options} role="group" aria-labelledby="setting-target">
            {TARGET_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.option} ${settings.targetScore === value ? styles.selected : ''}`}
                aria-pressed={settings.targetScore === value}
                onClick={() => onChange({ targetScore: value })}
              >
                {value} 個
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
                className={`${styles.option} ${settings.difficulty === option.value ? styles.selected : ''}`}
                aria-pressed={settings.difficulty === option.value}
                onClick={() => onChange({ difficulty: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.note}>
        簡單：字本身就是部首的題目（手、日、火⋯）。普通：形近字、同音字。挑戰：再加入部首不明顯的字（教、影、島⋯）。
        <br />
        選詞語時國字會被 emoji 遮住，要自己記住剛才那個字。
      </p>

      <ActionButton onClick={onBack} variant="secondary">
        回首頁
      </ActionButton>
    </div>
  );
}
