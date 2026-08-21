/**
 * 音效：優先使用 public/sounds/ 下的 mp3；
 * 若檔案不存在（第一版沒有附上音檔），就用 Web Audio API 即時合成，
 * 這樣離線也一定有聲音，而且不需要下載任何額外資源。
 */
export type SoundName =
  | 'answer-correct'
  | 'answer-wrong'
  | 'countdown'
  | 'game-start'
  | 'game-end';

const FILES: Record<SoundName, string> = {
  'answer-correct': 'sounds/answer-correct.mp3',
  'answer-wrong': 'sounds/answer-wrong.mp3',
  countdown: 'sounds/countdown.mp3',
  'game-start': 'sounds/game-start.mp3',
  'game-end': 'sounds/game-end.mp3',
};

/** 合成用的簡單音型：[頻率, 起始秒, 長度秒] */
const TONES: Record<SoundName, Array<[number, number, number]>> = {
  'answer-correct': [
    [784, 0, 0.1],
    [1046.5, 0.09, 0.18],
  ],
  'answer-wrong': [
    [311.1, 0, 0.12],
    [233.1, 0.1, 0.16],
  ],
  countdown: [[880, 0, 0.07]],
  'game-start': [
    [523.3, 0, 0.12],
    [659.3, 0.12, 0.12],
    [784, 0.24, 0.22],
  ],
  'game-end': [
    [784, 0, 0.16],
    [587.3, 0.16, 0.16],
    [392, 0.32, 0.34],
  ],
};

let context: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer | null>();
let enabled = true;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  return context;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

/**
 * iPad Safari 要求音訊必須由使用者手勢啟動，
 * 所以在「開始比賽」之類的按鈕上呼叫一次。
 */
export function unlockAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  void preload();
}

async function preload(): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  await Promise.all(
    (Object.keys(FILES) as SoundName[]).map(async (name) => {
      if (buffers.has(name)) return;
      buffers.set(name, null); // 先佔位，避免重複請求
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${FILES[name]}`);
        if (!response.ok) return;
        const type = response.headers.get('content-type') ?? '';
        if (!type.includes('audio') && !type.includes('octet-stream')) return;
        buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // 沒有音檔就維持 null，改用合成音
      }
    }),
  );
}

function playSynth(ctx: AudioContext, name: SoundName): void {
  const now = ctx.currentTime;
  for (const [frequency, offset, duration] of TONES[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = name === 'answer-wrong' ? 'sawtooth' : 'triangle';
    osc.frequency.value = frequency;
    const start = now + offset;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const buffer = buffers.get(name);
  if (buffer) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return;
  }
  playSynth(ctx, name);
}
