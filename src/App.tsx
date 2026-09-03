import { useCallback, useEffect, useState } from 'react';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useGame } from './hooks/useGame';
import type { PlayerId, Settings } from './types/game';
import { loadSettings, saveSettings } from './utils/storage';
import { setSoundEnabled, unlockAudio } from './utils/audio';
import styles from './App.module.css';

type Screen = 'home' | 'game' | 'result' | 'settings';

/** 「○○ 完成！」停留多久再切到結果畫面 */
const FINISH_BANNER_MS = 1200;

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('home');
  const [finishedBanner, setFinishedBanner] = useState<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.soundEnabled);
  }, [settings]);

  const handleFinish = useCallback((winner: PlayerId | null) => {
    // 有人達標 → 停止兩邊操作、中央先報成績，再進結果畫面
    setFinishedBanner(`${winner === 'player2' ? '玩家 B' : '玩家 A'} 完成！`);
    window.setTimeout(() => {
      setFinishedBanner(null);
      setScreen('result');
    }, FINISH_BANNER_MS);
  }, []);

  const game = useGame(settings, handleFinish);

  const startGame = useCallback(() => {
    unlockAudio(); // iPad Safari 需要使用者手勢才能播放聲音
    setFinishedBanner(null);
    setScreen('game');
    game.start();
  }, [game]);

  const backHome = useCallback(() => {
    game.backToIdle();
    setScreen('home');
  }, [game]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <div className={styles.app}>
      <div className={styles.rotateNotice} role="alert">
        <span className={styles.rotateIcon} aria-hidden="true">
          🔄
        </span>
        <p className={styles.rotateText}>
          請把 iPad 轉成橫向
          <br />
          兩個人才能一起玩喔！
        </p>
      </div>

      {screen === 'home' && (
        <HomeScreen settings={settings} onStart={startGame} onOpenSettings={() => setScreen('settings')} />
      )}

      {screen === 'settings' && (
        <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => setScreen('home')} />
      )}

      {screen === 'game' && (
        <GameScreen
          player1={game.player1}
          player2={game.player2}
          targetScore={game.targetScore}
          remainingToWin={game.remainingToWin}
          active={game.status === 'playing'}
          countdownValue={game.countdownValue}
          finishedBanner={finishedBanner}
          onSelect={game.selectAnswer}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          player1Name={game.player1.name}
          player2Name={game.player2.name}
          player1Score={game.player1.score}
          player2Score={game.player2.score}
          targetScore={game.targetScore}
          onPlayAgain={startGame}
          onBackHome={backHome}
        />
      )}
    </div>
  );
}
