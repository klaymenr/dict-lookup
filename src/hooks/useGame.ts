import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import questionData from '../data/questions.json';
import type { Difficulty, Question } from '../types/question';
import type { Feedback, GameState, MascotId, PlayerId, PlayerState, Settings } from '../types/game';
import { pickOne, shuffle } from '../utils/shuffle';
import { playSound } from '../utils/audio';
import { useCountdown } from './useCountdown';

const ALL_QUESTIONS = questionData as Question[];

/** 答對部首後停留多久再換成詞語 */
const CORRECT_RADICAL_MS = 420;
/** 答對詞語後停留多久再換下一題 */
const CORRECT_WORD_MS = 520;
/** 答錯提示顯示多久 */
const WRONG_FEEDBACK_MS = 1000;
/** 開場 3、2、1 每個數字停留多久 */
const COUNTDOWN_STEP_MS = 800;

const MASCOTS: MascotId[] = ['rabbit', 'cat'];

const WRONG_MESSAGES = ['再想想看！', '差一點，再試一次！', '沒關係，換一個看看！', '別急，慢慢找！'];
const RADICAL_OK_MESSAGES = ['部首找到了！', '答對了！', '就是這個部首！'];
const WORD_OK_MESSAGES = ['答對了！', '好棒！', '這個詞沒錯！'];

const NO_FEEDBACK: Feedback = { kind: 'none', mascot: 'rabbit', message: '', token: 0 };

function createPlayer(id: PlayerId, name: string, question: Question): PlayerState {
  return {
    id,
    name,
    score: 0,
    question,
    stage: 'radical',
    feedback: NO_FEEDBACK,
    wrongChoices: [],
    correctChoice: null,
    locked: false,
  };
}

export interface UseGameApi extends GameState {
  /** 3 / 2 / 1 / 0（0 表示「開始！」），null 表示沒有在倒數 */
  countdownValue: number | null;
  /** 時鐘外圈剩餘比例 0~1 */
  timerProgress: number;
  start: () => void;
  backToIdle: () => void;
  selectAnswer: (playerId: PlayerId, answer: string) => void;
}

export function useGame(settings: Settings, onFinish: (p1: number, p2: number) => void): UseGameApi {
  const pool = useMemo(
    () => ALL_QUESTIONS.filter((q) => q.difficulty <= (settings.maxDifficulty as Difficulty)),
    [settings.maxDifficulty],
  );

  const deckRef = useRef<Question[]>([]);
  const cursorRef = useRef(0);

  const buildDeck = useCallback((): Question[] => {
    // 依難度由易到難排列，同難度內洗牌：
    // 兩位玩家拿到的是相鄰的題目，難度自然相近。
    const groups: Question[][] = [1, 2, 3].map((level) => shuffle(pool.filter((q) => q.difficulty === level)));
    return groups.flat();
  }, [pool]);

  const dealNext = useCallback(
    (excludeId?: string): Question => {
      if (cursorRef.current >= deckRef.current.length) {
        // 22. 一局內不重複同一個國字；題目用完才重新洗牌
        deckRef.current = buildDeck();
        cursorRef.current = 0;
      }
      let question = deckRef.current[cursorRef.current];
      cursorRef.current += 1;
      // 同一時間兩位玩家不能拿到一模一樣的題目
      if (excludeId && question.id === excludeId && cursorRef.current < deckRef.current.length) {
        const swapped = deckRef.current[cursorRef.current];
        deckRef.current[cursorRef.current] = question;
        cursorRef.current += 1;
        question = swapped;
      }
      return question;
    },
    [buildDeck],
  );

  const createInitialState = useCallback((): GameState => {
    deckRef.current = buildDeck();
    cursorRef.current = 0;
    const q1 = dealNext();
    const q2 = dealNext(q1.id);
    return {
      status: 'idle',
      timeRemaining: settings.duration,
      player1: createPlayer('player1', '玩家 A', q1),
      player2: createPlayer('player2', '玩家 B', q2),
    };
  }, [buildDeck, dealNext, settings.duration]);

  const [state, setState] = useState<GameState>(createInitialState);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  /**
   * gameRef 是唯一的真實狀態來源；setState 只負責同步畫面。
   * 這樣所有副作用（音效、setTimeout）都在 updater 之外，
   * React StrictMode 重複執行 updater 也不會重複觸發。
   */
  const gameRef = useRef<GameState>(state);
  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setState(next);
  }, []);
  const commitPlayer = useCallback(
    (playerId: PlayerId, player: PlayerState) => {
      commit({ ...gameRef.current, [playerId]: player });
    },
    [commit],
  );

  const timeUpRef = useRef<() => void>(() => {});
  const timer = useCountdown(() => timeUpRef.current());

  const timeoutsRef = useRef<number[]>([]);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const feedbackTokenRef = useRef(0);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timeoutsRef.current.push(id);
  }, []);

  const clearPendingTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const finishGame = useCallback(() => {
    const current = gameRef.current;
    if (current.status === 'finished') return;
    clearPendingTimeouts();
    timer.stop();
    playSound('game-end');
    commit({
      ...current,
      status: 'finished',
      timeRemaining: 0,
      player1: { ...current.player1, feedback: NO_FEEDBACK, locked: true },
      player2: { ...current.player2, feedback: NO_FEEDBACK, locked: true },
    });
    finishRef.current(current.player1.score, current.player2.score);
  }, [clearPendingTimeouts, commit, timer]);
  timeUpRef.current = finishGame;

  const start = useCallback(() => {
    clearPendingTimeouts();
    timer.reset(settings.duration);
    deckRef.current = buildDeck();
    cursorRef.current = 0;
    const q1 = dealNext();
    const q2 = dealNext(q1.id);
    commit({
      status: 'countdown',
      timeRemaining: settings.duration,
      player1: createPlayer('player1', '玩家 A', q1),
      player2: createPlayer('player2', '玩家 B', q2),
    });

    // 16. 3 → 2 → 1 → 開始！ 之後才啟動計時
    setCountdownValue(3);
    playSound('countdown');
    [2, 1].forEach((value, index) => {
      later(() => {
        setCountdownValue(value);
        playSound('countdown');
      }, COUNTDOWN_STEP_MS * (index + 1));
    });
    later(() => {
      setCountdownValue(0); // 0 代表「開始！」
      playSound('game-start');
    }, COUNTDOWN_STEP_MS * 3);
    later(() => {
      setCountdownValue(null);
      commit({ ...gameRef.current, status: 'playing' });
      timer.start(settings.duration);
    }, COUNTDOWN_STEP_MS * 3 + 700);
  }, [buildDeck, clearPendingTimeouts, commit, dealNext, later, settings.duration, timer]);

  const backToIdle = useCallback(() => {
    clearPendingTimeouts();
    timer.reset(settings.duration);
    setCountdownValue(null);
    commit({ ...gameRef.current, status: 'idle', timeRemaining: settings.duration });
  }, [clearPendingTimeouts, commit, settings.duration, timer]);

  /**
   * 28 / 29. 兩位玩家的題目、階段、回饋完全獨立，
   * 只有中央倒數是共用的；一邊答錯不會擋住另一邊。
   */
  const selectAnswer = useCallback(
    (playerId: PlayerId, answer: string) => {
      const current = gameRef.current;
      if (current.status !== 'playing') return;

      const player = current[playerId];
      // 答對動畫播放中只鎖住這一位玩家
      if (player.locked) return;
      if (player.wrongChoices.includes(answer)) return;

      const isRadicalStage = player.stage === 'radical';
      const isCorrect = isRadicalStage
        ? answer === player.question.radical
        : answer === player.question.correctWord;

      feedbackTokenRef.current += 1;
      const token = feedbackTokenRef.current;

      if (!isCorrect) {
        // 11. 答錯不換題，玩家可以繼續選其他答案
        playSound('answer-wrong');
        commitPlayer(playerId, {
          ...player,
          wrongChoices: [...player.wrongChoices, answer],
          feedback: {
            kind: 'wrong',
            mascot: pickOne(MASCOTS),
            message: pickOne(WRONG_MESSAGES),
            token,
          },
        });
        later(() => {
          const latest = gameRef.current[playerId];
          if (latest.feedback.token === token) {
            commitPlayer(playerId, { ...latest, feedback: NO_FEEDBACK });
          }
        }, WRONG_FEEDBACK_MS);
        return;
      }

      playSound('answer-correct');

      if (isRadicalStage) {
        // 13. 部首答對本身不計分，只切換到詞語階段
        commitPlayer(playerId, {
          ...player,
          correctChoice: answer,
          locked: true,
          feedback: {
            kind: 'correct',
            mascot: pickOne(MASCOTS),
            message: pickOne(RADICAL_OK_MESSAGES),
            token,
          },
        });
        later(() => {
          const latest = gameRef.current[playerId];
          commitPlayer(playerId, {
            ...latest,
            stage: 'word',
            wrongChoices: [],
            correctChoice: null,
            locked: false,
            feedback: NO_FEEDBACK,
          });
        }, CORRECT_RADICAL_MS);
        return;
      }

      // 詞語也答對：部首 + 詞語都對，才得 1 分
      commitPlayer(playerId, {
        ...player,
        score: player.score + 1,
        correctChoice: answer,
        locked: true,
        feedback: {
          kind: 'correct',
          mascot: pickOne(MASCOTS),
          message: pickOne(WORD_OK_MESSAGES),
          token,
        },
      });
      later(() => {
        const latest = gameRef.current[playerId];
        const other = gameRef.current[playerId === 'player1' ? 'player2' : 'player1'];
        commitPlayer(playerId, {
          ...latest,
          question: dealNext(other.question.id),
          stage: 'radical',
          wrongChoices: [],
          correctChoice: null,
          locked: false,
          feedback: NO_FEEDBACK,
        });
      }, CORRECT_WORD_MS);
    },
    [commitPlayer, dealNext, later],
  );

  // 14.2 最後 3 秒的 tick 音
  useEffect(() => {
    if (state.status !== 'playing') return;
    if (timer.secondsRemaining <= 3 && timer.secondsRemaining > 0) playSound('countdown');
  }, [state.status, timer.secondsRemaining]);

  // 離開畫面時清掉所有等待中的計時器
  useEffect(() => clearPendingTimeouts, [clearPendingTimeouts]);

  // 在設定頁調整局時長後，待機狀態的顯示要跟著更新
  useEffect(() => {
    if (gameRef.current.status === 'idle') {
      timer.reset(settings.duration);
      commit({ ...gameRef.current, timeRemaining: settings.duration });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.duration]);

  return {
    ...state,
    timeRemaining: state.status === 'playing' ? timer.secondsRemaining : state.timeRemaining,
    countdownValue,
    timerProgress: state.status === 'playing' ? timer.progress : state.status === 'finished' ? 0 : 1,
    start,
    backToIdle,
    selectAnswer,
  };
}
