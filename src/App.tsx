import { useCallback, useEffect, useRef, useState } from 'react';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useGame } from './hooks/useGame';
import type { Settings } from './types/game';
import { loadSettings, saveSettings } from './utils/storage';
import { setSoundEnabled, unlockAudio } from './utils/audio';
import styles from './App.module.css';

type Screen = 'home' | 'game' | 'result' | 'settings';

/** 「時間到！」停留多久再切到結果畫面 */
const TIME_UP_MS = 1200;

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('home');
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.soundEnabled);
  }, [settings]);

  const handleFinish = useCallback((player1Score: number, player2Score: number) => {
    const best = Math.max(player1Score, player2Score);
    const isRecord = best > settingsRef.current.bestScore;
    setIsNewRecord(isRecord);
    if (isRecord) setSettings((prev) => ({ ...prev, bestScore: best }));

    // 17. 時間到 → 停止操作、中央顯示「時間到！」→ 才進結果畫面
    setShowTimeUp(true);
    window.setTimeout(() => {
      setShowTimeUp(false);
      setScreen('result');
    }, TIME_UP_MS);
  }, []);

  const game = useGame(settings, handleFinish);

  const startGame = useCallback(() => {
    unlockAudio(); // iPad Safari 需要使用者手勢才能播放聲音
    setIsNewRecord(false);
    setShowTimeUp(false);
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
          seconds={game.timeRemaining}
          timerProgress={game.timerProgress}
          active={game.status === 'playing'}
          countdownValue={game.countdownValue}
          showTimeUp={showTimeUp}
          onSelect={game.selectAnswer}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          player1Name={game.player1.name}
          player2Name={game.player2.name}
          player1Score={game.player1.score}
          player2Score={game.player2.score}
          isNewRecord={isNewRecord}
          onPlayAgain={startGame}
          onBackHome={backHome}
        />
      )}
    </div>
  );
}
