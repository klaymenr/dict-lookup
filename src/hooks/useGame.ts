import { useCallback, useEffect, useRef, useState } from 'react';
import questionData from '../data/questions.json';
import type { Question } from '../types/question';
import type { Feedback, GameState, MascotId, PlayerId, PlayerState, Settings } from '../types/game';
import { buildDeck as buildDeckFor } from '../utils/deck';
import { pickOne } from '../utils/shuffle';
import { HIDDEN_CHARACTER_EMOJI } from '../utils/emoji';
import { playSound } from '../utils/audio';

const ALL_QUESTIONS = questionData as Question[];

/** 答對部首後停留多久再換成詞語 */
const CORRECT_RADICAL_MS = 420;
/** 答對詞語後停留多久再換下一題 */
const CORRECT_WORD_MS = 520;
/**
 * 答錯後鎖住這一位玩家多久：防止玩家用連點把答案試出來。
 * 同一個常數也是提示泡泡顯示的時間 —— 泡泡在畫面上就是「還要等多久」的計時器，
 * 要調整請兩邊一起改，不要拆成兩個數字。
 */
const WRONG_PENALTY_MS = 1000;
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
    wordEmoji: HIDDEN_CHARACTER_EMOJI[0],
    feedback: NO_FEEDBACK,
    wrongChoices: [],
    correctChoice: null,
    locked: false,
  };
}

export interface UseGameApi extends GameState {
  /** 3 / 2 / 1 / 0（0 表示「開始！」），null 表示沒有在倒數 */
  countdownValue: number | null;
  /** 領先者距離獲勝還差幾個字：中央「還剩下幾個字」用的 */
  remainingToWin: number;
  start: () => void;
  backToIdle: () => void;
  selectAnswer: (playerId: PlayerId, answer: string) => void;
}

export function useGame(settings: Settings, onFinish: (winner: PlayerId | null) => void): UseGameApi {
  const deckRef = useRef<Question[]>([]);
  const cursorRef = useRef(0);

  const buildDeck = useCallback(
    () => buildDeckFor(ALL_QUESTIONS, settings.difficulty, settings.targetScore),
    [settings.difficulty, settings.targetScore],
  );

  const dealNext = useCallback(
    (excludeId?: string): Question => {
      if (cursorRef.current >= deckRef.current.length) {
        // 一局內不重複同一個國字；題目用完才重新洗牌
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
      targetScore: settings.targetScore,
      winner: null,
      player1: createPlayer('player1', '玩家 A', q1),
      player2: createPlayer('player2', '玩家 B', q2),
    };
  }, [buildDeck, dealNext, settings.targetScore]);

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

  /** 有人達到目標字數就結束整局 */
  const finishGame = useCallback(
    (winner: PlayerId) => {
      const current = gameRef.current;
      if (current.status === 'finished') return;
      clearPendingTimeouts();
      playSound('game-end');
      commit({
        ...current,
        status: 'finished',
        winner,
        player1: { ...current.player1, feedback: NO_FEEDBACK, locked: true },
        player2: { ...current.player2, feedback: NO_FEEDBACK, locked: true },
      });
      finishRef.current(winner);
    },
    [clearPendingTimeouts, commit],
  );

  const start = useCallback(() => {
    clearPendingTimeouts();
    deckRef.current = buildDeck();
    cursorRef.current = 0;
    const q1 = dealNext();
    const q2 = dealNext(q1.id);
    commit({
      status: 'countdown',
      targetScore: settings.targetScore,
      winner: null,
      player1: createPlayer('player1', '玩家 A', q1),
      player2: createPlayer('player2', '玩家 B', q2),
    });

    // 3 → 2 → 1 → 開始！ 之後才開放作答
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
    }, COUNTDOWN_STEP_MS * 3 + 700);
  }, [buildDeck, clearPendingTimeouts, commit, dealNext, later, settings.targetScore]);

  const backToIdle = useCallback(() => {
    clearPendingTimeouts();
    setCountdownValue(null);
    commit({ ...gameRef.current, status: 'idle', targetScore: settings.targetScore, winner: null });
  }, [clearPendingTimeouts, commit, settings.targetScore]);

  /**
   * 兩位玩家的題目、階段、回饋完全獨立，
   * 只有中央的「還剩下幾個字」是共用的；一邊答錯不會擋住另一邊。
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
        // 答錯不換題，但先鎖住這一位玩家 WRONG_PENALTY_MS，
        // 讓「不知道就一直亂按」變成有成本的事（另一位玩家不受影響）。
        playSound('answer-wrong');
        commitPlayer(playerId, {
          ...player,
          wrongChoices: [...player.wrongChoices, answer],
          locked: true,
          feedback: {
            kind: 'wrong',
            mascot: pickOne(MASCOTS),
            message: pickOne(WRONG_MESSAGES),
            token,
          },
        });
        later(() => {
          const latest = gameRef.current[playerId];
          // 解鎖不綁 token：萬一 token 被別的流程換掉，這一邊會永遠解不開。
          commitPlayer(playerId, {
            ...latest,
            locked: false,
            feedback: latest.feedback.token === token ? NO_FEEDBACK : latest.feedback,
          });
        }, WRONG_PENALTY_MS);
        return;
      }

      playSound('answer-correct');

      if (isRadicalStage) {
        // 部首答對本身不算完成，只切換到詞語階段（國字改用 emoji 遮起來）
        const emoji = pickOne(HIDDEN_CHARACTER_EMOJI);
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
            wordEmoji: emoji,
            wrongChoices: [],
            correctChoice: null,
            locked: false,
            feedback: NO_FEEDBACK,
          });
        }, CORRECT_RADICAL_MS);
        return;
      }

      // 詞語也答對：部首 + 詞語都對，才算完成 1 個字
      const nextScore = player.score + 1;
      commitPlayer(playerId, {
        ...player,
        score: nextScore,
        correctChoice: answer,
        locked: true,
        feedback: {
          kind: 'correct',
          mascot: pickOne(MASCOTS),
          message: pickOne(WORD_OK_MESSAGES),
          token,
        },
      });

      if (nextScore >= gameRef.current.targetScore) {
        // 先答對目標字數的人獲勝，讓答對動畫播完再結束
        later(() => finishGame(playerId), CORRECT_WORD_MS);
        return;
      }

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
    [commitPlayer, dealNext, finishGame, later],
  );

  // 離開畫面時清掉所有等待中的計時器
  useEffect(() => clearPendingTimeouts, [clearPendingTimeouts]);

  // 待機時就跟著設定走，這樣在設定頁改完目標字數，首頁與中央顯示會立刻更新
  const targetScore = state.status === 'idle' ? settings.targetScore : state.targetScore;
  const remainingToWin = Math.max(
    0,
    Math.min(targetScore - state.player1.score, targetScore - state.player2.score),
  );

  return {
    ...state,
    targetScore,
    countdownValue,
    remainingToWin,
    start,
    backToIdle,
    selectAnswer,
  };
}
