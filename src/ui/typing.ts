import type { Line } from '../domain/schema';

/**
 * 私訊的打字特效：把「在輸入框裡打字、想一下、刪掉重寫、送出」演出來。
 *
 * 只用文字本身與一個游標，不新增任何視覺元件——泡泡、顏色、字體都沿用既有的訊息卡樣式，
 * 這裡負責的是動畫行為（打字節奏、思考停頓、刪除、送出時機）。
 *
 * 這個模組刻意不碰 DOM：`planTyping` 把一句台詞算成一份計畫，`buildFrames` 把計畫展開成
 * 「等多久 → 畫面上顯示什麼」的序列，`runTyping` 才用 setTimeout 走完它。
 * 因此節奏可以直接用單元測試鎖住，不必開瀏覽器。
 */

/** 逐字打出來的間隔。 */
const CHAR_MS = 38;
/** 刪字比打字快：退格是按住的，不是一個一個想。 */
const ERASE_MS = 26;
/** 開始打第一個字之前的停頓：游標在空白的輸入框裡閃了一下。 */
const LEAD_MS = 320;
/** 草稿打完、決定刪掉之前的停頓——看著自己剛寫的東西想的那一下。 */
const DRAFT_HOLD_MS = 460;
/** 刪乾淨之後、重新開始打之前的停頓。 */
const RESET_MS = 260;
/** 打完到「送出」之間的停頓：手指停在送出鍵上那一下。 */
const SEND_MS = 220;

/**
 * 標點之後的短延遲：句子裡的呼吸。
 * 句號與問號停得比逗號久，讀起來才像人在想下一句要不要這樣寫。
 */
const PAUSE_AFTER: Record<string, number> = {
  '。': 260,
  '！': 260,
  '？': 300,
  '，': 140,
  '、': 120,
  '：': 150,
  '；': 160,
  '—': 90,
  '…': 130,
  '\n': 260,
};

/** 打完這個字之後要多停多久。非標點是 0。 */
export function pauseAfter(char: string): number {
  return PAUSE_AFTER[char] ?? 0;
}

/** 計畫裡的一段：停一下 → 逐字打出 text → 停一下 →（草稿才）逐字刪掉。 */
export interface TypingSegment {
  text: string;
  /** 開始打第一個字之前的停頓。 */
  leadMs: number;
  /** 打完最後一個字之後的停頓。 */
  holdMs: number;
  /** true＝這是草稿，停完之後逐字刪掉；false＝留在畫面上。 */
  erase: boolean;
}

export interface TypingPlan {
  segments: TypingSegment[];
  /** 特效跑完後留在畫面上的字（＝這句台詞的正式內容）。 */
  finalText: string;
  /** 最後是否要演「送出」（只有訊息會送出）。 */
  send: boolean;
  /**
   * 預留高度用的文字：過程中出現過的最長一段。
   * 對話框的高度先照這段算好，打字時就不會一行一行把面板往上頂。
   */
  sizerText: string;
}

/** 展開後的一格：等 `delayMs`，然後把畫面上的字換成 `text`。 */
export interface TypingFrame {
  text: string;
  delayMs: number;
}

function longer(a: string, b: string): string {
  return [...b].length > [...a].length ? b : a;
}

/**
 * 算出這句台詞的打字計畫；不需要特效時回傳 undefined。
 *
 * - **訊息**（`kind: 'message'`）：正式內容逐字打出來，打完才送出。
 * - **有 `drafts` 的其他台詞**（旁白、內心）：只演草稿被打了又刪掉，
 *   正式內容照原本的方式直接出現——那段文字是在「描述」剛才那個動作，
 *   本身不是輸入框裡的字，逐字打出來反而會變成同一件事講兩次。
 */
export function planTyping(line: Line): TypingPlan | undefined {
  const drafts = (line.drafts ?? []).filter((draft) => draft.length > 0);
  const isMessage = line.kind === 'message';
  if (line.text.length === 0) return undefined;
  if (!isMessage && drafts.length === 0) return undefined;

  const segments: TypingSegment[] = drafts.map((text, index) => ({
    text,
    leadMs: index === 0 ? LEAD_MS : RESET_MS,
    holdMs: DRAFT_HOLD_MS,
    erase: true,
  }));
  if (isMessage) {
    segments.push({
      text: line.text,
      leadMs: segments.length === 0 ? LEAD_MS : RESET_MS,
      holdMs: 0,
      erase: false,
    });
  }

  return {
    segments,
    finalText: line.text,
    send: isMessage,
    sizerText: [line.text, ...drafts].reduce(longer, line.text),
  };
}

/** 把計畫展開成一連串「等多久 → 顯示什麼」。 */
export function buildFrames(plan: TypingPlan): TypingFrame[] {
  const frames: TypingFrame[] = [];
  for (const segment of plan.segments) {
    const chars = [...segment.text];
    if (chars.length === 0) continue;
    for (let i = 0; i < chars.length; i += 1) {
      // 前一個字是標點時，這個字要晚一點才出現——停頓落在標點「之後」。
      const breath = i > 0 ? pauseAfter(chars[i - 1]) : 0;
      frames.push({ text: chars.slice(0, i + 1).join(''), delayMs: (i === 0 ? segment.leadMs : 0) + CHAR_MS + breath });
    }
    if (!segment.erase) continue;
    for (let i = chars.length - 1; i >= 0; i -= 1) {
      frames.push({ text: chars.slice(0, i).join(''), delayMs: (i === chars.length - 1 ? segment.holdMs : 0) + ERASE_MS });
    }
  }
  // 草稿全部刪完後，正式內容直接出現（訊息的最後一段已經是正式內容，不重複加）。
  const last = frames[frames.length - 1];
  if (!last || last.text !== plan.finalText) frames.push({ text: plan.finalText, delayMs: RESET_MS });
  return frames;
}

export interface TypingCallbacks {
  /** 把畫面上的字換成 text。 */
  write: (text: string) => void;
  /** 訊息送出的那一下（`plan.send` 為 true 時才會呼叫，且只呼叫一次）。 */
  onSend?: () => void;
  /** 整段特效結束（含被 finish() 直接跳到結尾）。 */
  onDone?: () => void;
}

export interface TypingHandle {
  /** 立刻跳到結尾：玩家點畫面時用，等同「這句我不等了」。 */
  finish: () => void;
  /** 中止並且不呼叫任何收尾（畫面已經換掉時用）。 */
  cancel: () => void;
}

/** 依計畫播放打字特效。呼叫端負責把 `write` 接到實際的文字節點上。 */
export function runTyping(plan: TypingPlan, callbacks: TypingCallbacks): TypingHandle {
  const frames = buildFrames(plan);
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  let done = false;

  const clear = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const complete = (): void => {
    if (cancelled || done) return;
    done = true;
    clear();
    if (plan.send) callbacks.onSend?.();
    callbacks.onDone?.();
  };

  const step = (): void => {
    if (cancelled || done) return;
    if (index >= frames.length) {
      // 打完了才送出：手指停在送出鍵上那一下。
      if (plan.send) timer = setTimeout(complete, SEND_MS);
      else complete();
      return;
    }
    const frame = frames[index];
    index += 1;
    timer = setTimeout(() => {
      if (cancelled || done) return;
      callbacks.write(frame.text);
      step();
    }, frame.delayMs);
  };

  step();

  return {
    finish: () => {
      if (cancelled || done) return;
      clear();
      callbacks.write(plan.finalText);
      complete();
    },
    cancel: () => {
      cancelled = true;
      clear();
    },
  };
}
