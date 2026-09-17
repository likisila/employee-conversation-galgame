import { describe, expect, it } from 'vitest';
import { StoryEngine } from '../src/engine/StoryEngine';
import type { LoadedContent } from '../src/data/contentLoader';
import type { Line, Scene } from '../src/domain/schema';

function lines(...texts: string[]): Line[] {
  return texts.map((text) => ({ text }));
}

function scene(id: string, partial: Partial<Scene> = {}): Scene {
  return { id, lines: [], choices: [], ...partial };
}

/** first（兩句）→ second（兩句，有選項）→ after（兩句）→ tail（一句，結局）。 */
function makeContent(): LoadedContent {
  const scenes = new Map<string, Scene>([
    ['first', scene('first', { lines: lines('a1', 'a2'), next: 'second' })],
    ['second', scene('second', {
      lines: lines('b1', 'b2'),
      choices: [{ id: 'go', text: 'go', next: 'after', effects: [{ variable: 'trust', operation: 'add', value: 1 }] }],
    })],
    ['after', scene('after', { lines: lines('c1', 'c2'), next: 'tail' })],
    ['tail', scene('tail', { lines: lines('d1'), ending: true })],
  ]);
  return {
    manifest: { game: 'game.json', characters: 'characters.json', scenes: [] },
    game: { id: 'test-game', title: 'Test', startScene: 'first', initialState: { trust: 0 } },
    characters: new Map(),
    scenes,
    ui: {
      choicePrompt: '', continueLabel: '', restartLabel: '', narratorName: '',
      startLabel: '', loadingLabel: '', subtitle: '', resumeLabel: '', newGameLabel: '',
      playerLabel: '', tapToContinueLabel: '', backLabel: '',
    },
    images: { characters: {}, backgrounds: {}, sceneBackgrounds: {}, screens: {}, ui: {}, transitions: {}, scenePresentation: {} },
  };
}

describe('回上一句', () => {
  it('遊戲一開始沒有上一句可回', () => {
    const engine = new StoryEngine(makeContent());
    expect(engine.canGoBack).toBe(false);
    expect(engine.back()).toBe(false);
    expect(engine.currentLine?.text).toBe('a1');
  });

  it('同場景內前進後可以退回上一句', () => {
    const engine = new StoryEngine(makeContent());
    engine.advance();
    expect(engine.currentLine?.text).toBe('a2');
    expect(engine.canGoBack).toBe(true);
    expect(engine.back()).toBe(true);
    expect(engine.currentLine?.text).toBe('a1');
    expect(engine.canGoBack).toBe(false);
  });

  it('跨場景（沒有選項的 next）可以退回上一場最後一句', () => {
    const engine = new StoryEngine(makeContent());
    engine.advance(); // a2
    engine.advance(); // → second / b1
    expect(engine.currentScene.id).toBe('second');
    engine.back();
    expect(engine.currentScene.id).toBe('first');
    expect(engine.currentLineIndex).toBe(1);
    expect(engine.currentLine?.text).toBe('a2');
  });

  it('退回後再前進，走的還是同一條路', () => {
    const engine = new StoryEngine(makeContent());
    engine.advance();
    engine.back();
    engine.advance();
    expect(engine.currentLine?.text).toBe('a2');
    expect(engine.canGoBack).toBe(true);
  });

  it('做出選擇後不能回到選擇的那一頁', () => {
    const engine = new StoryEngine(makeContent());
    engine.advance(); // a2
    engine.advance(); // second / b1
    engine.advance(); // b2（選項頁）
    engine.choose('go');
    expect(engine.currentScene.id).toBe('after');
    expect(engine.canGoBack).toBe(false);
    expect(engine.back()).toBe(false);
    expect(engine.currentScene.id).toBe('after');
  });

  it('選擇後的新場景內，回溯只退到該場景的第一句為止', () => {
    const engine = new StoryEngine(makeContent());
    engine.advance();
    engine.advance();
    engine.advance();
    engine.choose('go');
    engine.advance(); // c2
    expect(engine.back()).toBe(true);
    expect(engine.currentLine?.text).toBe('c1');
    expect(engine.canGoBack).toBe(false);
    expect(engine.currentState.trust).toBe(1);
  });

  it('載入存檔與重新開始都不保留回溯紀錄', () => {
    const engine = new StoryEngine(makeContent());
    engine.advance();
    engine.restore({ sceneId: 'after', state: { trust: 1 }, lineIndex: 1 });
    expect(engine.canGoBack).toBe(false);

    engine.advance();
    expect(engine.canGoBack).toBe(true);
    engine.restart();
    expect(engine.canGoBack).toBe(false);
    expect(engine.currentScene.id).toBe('first');
  });
});
