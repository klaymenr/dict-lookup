import { useCallback, useEffect, useRef, useState } from 'react';

interface CountdownApi {
  /** 剩餘秒數，無條件進位（60 秒的局一開始就顯示 60） */
  secondsRemaining: number;
  /** 剩餘比例 0~1，給時鐘外圈用 */
  progress: number;
  start: (durationSeconds: number) => void;
  stop: () => void;
  reset: (durationSeconds: number) => void;
}

/**
 * 以 performance.now() 的截止時間為準，所以即使畫面掉幀
 * 或 App 被切到背景，回來時剩餘時間仍然正確。
 */
export function useCountdown(onFinish: () => void): CountdownApi {
  const [msRemaining, setMsRemaining] = useState(0);
  const [totalMs, setTotalMs] = useState(1);
  const deadlineRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const cancel = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const start = useCallback(
    (durationSeconds: number) => {
      cancel();
      const durationMs = durationSeconds * 1000;
      setTotalMs(durationMs);
      setMsRemaining(durationMs);
      deadlineRef.current = performance.now() + durationMs;

      const tick = () => {
        const remaining = Math.max(0, deadlineRef.current - performance.now());
        setMsRemaining(remaining);
        if (remaining <= 0) {
          frameRef.current = null;
          finishRef.current();
          return;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [cancel],
  );

  const reset = useCallback(
    (durationSeconds: number) => {
      cancel();
      setTotalMs(durationSeconds * 1000);
      setMsRemaining(durationSeconds * 1000);
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return {
    secondsRemaining: Math.ceil(msRemaining / 1000),
    progress: totalMs > 0 ? msRemaining / totalMs : 0,
    start,
    stop: cancel,
    reset,
  };
}
