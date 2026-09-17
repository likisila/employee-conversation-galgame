import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseLine, type Line } from '../src/domain/schema';
import { loadContent } from '../src/data/contentLoader';
import { buildFrames, pauseAfter, planTyping, runTyping } from '../src/ui/typing';

const line = (raw: Record<string, unknown>): Line => parseLine({ speaker: null, text: 'x', ...raw });
const message = (text: string, drafts?: string[]): Line =>
  line({ kind: 'message', channel: '私訊', from: '曾雅琳', text, ...(drafts ? { drafts } : {}) });

describe('planTyping', () => {
  it('leaves ordinary dialogue and narration alone', () => {
    expect(planTyping(line({ speaker: 'zhou-yuan', text: '不是說明天？' }))).toBeUndefined();
    expect(planTyping(line({ text: '雨澄準時進來。' }))).toBeUndefined();
  });

  it('types a message out and sends it', () => {
    const plan = planTyping(message('五點，月球。'))!;
    expect(plan.send).toBe(true);
    expect(plan.finalText).toBe('五點，月球。');
    expect(plan.segments).toEqual([{ text: '五點，月球。', leadMs: expect.any(Number), holdMs: 0, erase: false }]);
  });

  it('types each draft out, erases it, then types the real message', () => {
    const plan = planTyping(message('五點見。', ['方便聊聊嗎', '關於下季安排']))!;
    expect(plan.segments.map((segment) => [segment.text, segment.erase])).toEqual([
      ['方便聊聊嗎', true],
      ['關於下季安排', true],
      ['五點見。', false],
    ]);
    // 高度先照最長的那一段撐好，打字時對話框才不會一行一行變高。
    expect(plan.sizerText).toBe('關於下季安排');
  });

  it('only plays the draft-and-delete for a non-message line: its own text just appears', () => {
    const plan = planTyping(line({ speaker: 'zhou-yuan', kind: 'thought', text: '我寫下「方便聊聊嗎」，刪掉。', drafts: ['方便聊聊嗎'] }))!;
    expect(plan.send).toBe(false);
    expect(plan.segments.map((segment) => segment.text)).toEqual(['方便聊聊嗎']);
    expect(plan.finalText).toBe('我寫下「方便聊聊嗎」，刪掉。');
    // 最後一格才是正式內容，而且不是逐字打出來的。
    const frames = buildFrames(plan);
    expect(frames[frames.length - 1].text).toBe('我寫下「方便聊聊嗎」，刪掉。');
    expect(frames.filter((frame) => frame.text === '我寫下「方便聊聊嗎」，刪掉。')).toHaveLength(1);
  });
});

describe('buildFrames', () => {
  it('reveals one character at a time, then erases one at a time', () => {
    const frames = buildFrames(planTyping(message('好', ['嗨嗨']))!);
    expect(frames.map((frame) => frame.text)).toEqual(['嗨', '嗨嗨', '嗨', '', '好']);
  });

  it('waits longer after punctuation than after an ordinary character', () => {
    const frames = buildFrames(planTyping(message('好。走吧'))!);
    const texts = frames.map((frame) => frame.text);
    // 「走」接在句號之後，比「吧」接在「走」之後晚出現。
    const afterPeriod = frames[texts.indexOf('好。走')].delayMs;
    const afterPlain = frames[texts.indexOf('好。走吧')].delayMs;
    expect(afterPeriod).toBeGreaterThan(afterPlain);
    expect(afterPeriod - afterPlain).toBe(pauseAfter('。'));
  });

  it('gives the first character a longer lead-in than the rest', () => {
    const frames = buildFrames(planTyping(message('好吧'))!);
    expect(frames[0].delayMs).toBeGreaterThan(frames[1].delayMs);
  });
});

describe('runTyping', () => {
  afterEach(() => { vi.useRealTimers(); });

  const collect = (plan: ReturnType<typeof planTyping>) => {
    const written: string[] = [];
    const events: string[] = [];
    const handle = runTyping(plan!, {
      write: (text) => written.push(text),
      onSend: () => events.push('send'),
      onDone: () => events.push('done'),
    });
    return { written, events, handle };
  };

  it('writes every frame in order and sends at the end', () => {
    vi.useFakeTimers();
    const plan = planTyping(message('好', ['嗨']))!;
    const { written, events, handle } = collect(plan);
    expect(written).toEqual([]);
    vi.advanceTimersByTime(60_000);
    expect(written).toEqual(['嗨', '', '好']);
    expect(events).toEqual(['send', 'done']);
    // 已經跑完了，再按跳過不會重複觸發。
    handle.finish();
    expect(events).toEqual(['send', 'done']);
  });

  it('finish() jumps straight to the final text', () => {
    vi.useFakeTimers();
    const { written, events, handle } = collect(planTyping(message('最終版好了。五點，月球。')));
    vi.advanceTimersByTime(400);
    handle.finish();
    expect(written[written.length - 1]).toBe('最終版好了。五點，月球。');
    expect(events).toEqual(['send', 'done']);
    // 跳過之後不該再有任何計時器把舊的片段寫回去。
    const count = written.length;
    vi.advanceTimersByTime(60_000);
    expect(written).toHaveLength(count);
  });

  it('cancel() stops without finishing or announcing anything', () => {
    vi.useFakeTimers();
    const { written, events, handle } = collect(planTyping(message('五點，月球。')));
    vi.advanceTimersByTime(400);
    const count = written.length;
    handle.cancel();
    vi.advanceTimersByTime(60_000);
    expect(written).toHaveLength(count);
    expect(events).toEqual([]);
  });
});

describe('正式內容裡的打字段落', () => {
  const content = loadContent();
  const allLines = [...content.scenes.values()].flatMap((scene) => scene.lines.map((item) => ({ scene: scene.id, line: item })));

  it('每個 drafts 草稿都還在自己那句台詞的原文裡', () => {
    const drafted = allLines.filter((entry) => entry.line.drafts !== undefined);
    // 草稿不是新寫的文案，是把台詞裡已經有的那一段標記成可以演出來；
    // 文案改寫而草稿沒跟著改時，這裡會直接指名是哪一場。
    expect(drafted.length).toBeGreaterThan(0);
    for (const entry of drafted) {
      for (const draft of entry.line.drafts!) {
        expect(`${entry.scene}：${entry.line.text}`).toContain(draft);
      }
    }
  });

  it('所有私訊訊息都會打字並送出', () => {
    const messages = allLines.filter((entry) => entry.line.kind === 'message');
    expect(messages.length).toBeGreaterThan(0);
    for (const entry of messages) {
      const plan = planTyping(entry.line);
      expect(plan, `${entry.scene}：${entry.line.text}`).toBeDefined();
      expect(plan!.send).toBe(true);
      expect(plan!.finalText).toBe(entry.line.text);
    }
  });

  it('沒有 drafts 的一般對話與旁白不受影響', () => {
    const plain = allLines.filter((entry) => entry.line.kind !== 'message' && entry.line.drafts === undefined);
    expect(plain.every((entry) => planTyping(entry.line) === undefined)).toBe(true);
  });
});
