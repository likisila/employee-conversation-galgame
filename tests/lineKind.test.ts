import { describe, expect, it } from 'vitest';
import { parseLine } from '../src/domain/schema';
import { loadContent } from '../src/data/contentLoader';

describe('parseLine kind inference', () => {
  it('treats （內心） prefix as thought and strips the prefix', () => {
    const line = parseLine({ speaker: 'zhou-yuan', text: '（內心）每一種緩衝，看起來都像替我自己鋪的軟墊。' });
    expect(line.kind).toBe('thought');
    expect(line.text).toBe('每一種緩衝，看起來都像替我自己鋪的軟墊。');
  });

  it('treats 【頻道·發送者】 prefix as a message and extracts channel / sender', () => {
    const line = parseLine({ speaker: null, text: '【私訊·曾雅琳】最終版好了。五點，月球。' });
    expect(line).toMatchObject({ kind: 'message', channel: '私訊', from: '曾雅琳', text: '最終版好了。五點，月球。' });
  });

  it('defaults to narration without a speaker and dialogue with one', () => {
    expect(parseLine({ speaker: null, text: '雨澄準時進來。' }).kind).toBe('narration');
    expect(parseLine({ speaker: 'lin-yucheng', text: '我把檔案存好了。' }).kind).toBe('dialogue');
  });

  it('lets an explicit kind override inference', () => {
    const line = parseLine({ speaker: 'zhou-yuan', kind: 'narration', text: '（內心）雨澄站起來。' });
    expect(line.kind).toBe('narration');
    expect(line.text).toBe('（內心）雨澄站起來。');
  });

  it('accepts explicit message fields without a text prefix', () => {
    const line = parseLine({ speaker: null, kind: 'message', channel: 'Teams', from: '林雨澄', text: '收到。' });
    expect(line).toMatchObject({ kind: 'message', channel: 'Teams', from: '林雨澄', text: '收到。' });
  });

  it('rejects an unknown kind', () => {
    expect(() => parseLine({ speaker: null, kind: 'shout', text: 'x' })).toThrow();
  });

  it('leaves no raw （內心） or 【…·…】 prefixes in the real story content', () => {
    for (const scene of loadContent().scenes.values()) {
      for (const line of scene.lines) {
        expect(line.text, `${scene.id}: ${line.text}`).not.toMatch(/^[（(]內心[)）]|^【[^】]+[·・][^】]+】/);
      }
    }
  });
});
