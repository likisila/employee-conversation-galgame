import { describe, expect, it } from 'vitest';
import { StoryEngine } from '../src/engine/StoryEngine';
import type { LoadedContent } from '../src/data/contentLoader';
import type { Scene } from '../src/domain/schema';

function scene(id: string, partial: Partial<Scene> = {}): Scene {
  return { id, lines: [], choices: [], ...partial };
}

function makeContent(): LoadedContent {
  const scenes = new Map<string, Scene>([
    ['intro', scene('intro', {
      choices: [{ id: 'go', text: 'go', next: 'feedback', effects: [{ variable: 'trust', operation: 'add', value: 2 }] }],
    })],
    ['feedback', scene('feedback', { next: 'ending' })],
    ['ending', scene('ending', { ending: true })],
  ]);
  return {
    manifest: { game: 'game.json', characters: 'characters.json', scenes: [] },
    game: { id: 'test-game', title: 'Test', startScene: 'intro', initialState: { trust: 0, clarity: 0 } },
    characters: new Map(),
    scenes,
    ui: {
      choicePrompt: '', continueLabel: '', restartLabel: '', narratorName: '',
      startLabel: '', loadingLabel: '', subtitle: '', resumeLabel: '', newGameLabel: '', thoughtLabel: '', playerLabel: '', tapToContinueLabel: '',
    },
    images: { characters: {}, backgrounds: {}, sceneBackgrounds: {}, screens: {}, ui: {}, transitions: {}, scenePresentation: {} },
  };
}

describe('StoryEngine snapshot/restore', () => {
  it('captures scene and state in a snapshot', () => {
    const engine = new StoryEngine(makeContent());
    engine.choose('go');
    const snap = engine.snapshot;
    expect(snap.sceneId).toBe('feedback');
    expect(snap.state.trust).toBe(2);
  });

  it('snapshot state is a copy, not a live reference', () => {
    const engine = new StoryEngine(makeContent());
    const snap = engine.snapshot;
    engine.choose('go');
    expect(snap.state.trust).toBe(0);
    expect(snap.sceneId).toBe('intro');
  });

  it('restores a snapshot onto a fresh engine', () => {
    const engine = new StoryEngine(makeContent());
    engine.restore({ sceneId: 'feedback', state: { trust: 5, clarity: 3 } });
    expect(engine.currentScene.id).toBe('feedback');
    expect(engine.currentState.trust).toBe(5);
  });

  it('rejects a snapshot pointing at an unknown scene', () => {
    const engine = new StoryEngine(makeContent());
    expect(() => engine.restore({ sceneId: 'ghost', state: {} })).toThrow();
    // 引擎維持在原始場景，不被污染
    expect(engine.currentScene.id).toBe('intro');
  });

  it('restore then snapshot round-trips the same progress', () => {
    const engine = new StoryEngine(makeContent());
    const target = { sceneId: 'feedback', state: { trust: 4, clarity: 1 } };
    engine.restore(target);
    expect(engine.snapshot).toEqual({ ...target, lineIndex: 0 });
  });
});

describe('StoryEngine conditional lines and routing', () => {
  function routedContent(): LoadedContent {
    const base = makeContent();
    base.scenes = new Map<string, Scene>([
      ['pick', scene('pick', {
        lines: [
          { speaker: null, text: 'always' },
          { speaker: null, text: 'only-a', conditions: [{ variable: 'pick', operator: 'eq', value: 'a' }] },
        ],
        choices: [
          { id: 'a', text: 'a', next: 'gate', effects: [{ variable: 'pick', operation: 'set', value: 'a' }, { variable: 'trust', operation: 'add', value: 5 }] },
          { id: 'b', text: 'b', next: 'gate', effects: [{ variable: 'pick', operation: 'set', value: 'b' }] },
        ],
      })],
      ['gate', scene('gate', {
        route: [
          { conditions: [{ variable: 'trust', operator: 'gte', value: 5 }], next: 'good' },
          { next: 'bad' },
        ],
      })],
      ['good', scene('good', { lines: [{ speaker: null, text: 'only-a', conditions: [{ variable: 'pick', operator: 'eq', value: 'a' }] }], ending: true })],
      ['bad', scene('bad', { ending: true })],
    ]);
    base.game = { ...base.game, startScene: 'pick', initialState: { trust: 0 } };
    return base;
  }

  it('visibleLines hides lines whose conditions are not met', () => {
    const engine = new StoryEngine(routedContent());
    expect(engine.visibleLines.map((line) => line.text)).toEqual(['always']);
  });

  it('a routing scene is never landed on: choose() settles straight onto the routed target', () => {
    const engine = new StoryEngine(routedContent());
    engine.choose('a');
    expect(engine.currentScene.id).toBe('good');
    expect(engine.snapshot.sceneId).toBe('good');
    // 路由後的場景仍依已更新的狀態過濾台詞
    expect(engine.visibleLines.map((line) => line.text)).toEqual(['only-a']);
  });

  it('falls through to the default route entry when no condition matches', () => {
    const engine = new StoryEngine(routedContent());
    engine.choose('b');
    expect(engine.currentScene.id).toBe('bad');
  });

  it('restore() also settles a snapshot that points at a routing scene', () => {
    const engine = new StoryEngine(routedContent());
    engine.restore({ sceneId: 'gate', state: { trust: 5 } });
    expect(engine.currentScene.id).toBe('good');
  });

  it('throws instead of looping forever on a cyclic route', () => {
    const base = makeContent();
    base.scenes = new Map<string, Scene>([
      ['x', scene('x', { route: [{ next: 'y' }] })],
      ['y', scene('y', { route: [{ next: 'x' }] })],
    ]);
    base.game = { ...base.game, startScene: 'x' };
    expect(() => new StoryEngine(base)).toThrow(/循環/);
  });
});

describe('StoryEngine line-by-line advancement', () => {
  function linedContent(): LoadedContent {
    const base = makeContent();
    base.scenes = new Map<string, Scene>([
      ['talk', scene('talk', {
        lines: [
          { speaker: null, text: 'one' },
          { speaker: null, text: 'hidden', conditions: [{ variable: 'flag', operator: 'eq', value: true }] },
          { speaker: null, text: 'two' },
          { speaker: null, text: 'three' },
        ],
        choices: [{ id: 'go', text: 'go', next: 'after' }],
      })],
      ['after', scene('after', { lines: [{ speaker: null, text: 'a' }, { speaker: null, text: 'b' }], next: 'end' })],
      ['end', scene('end', { lines: [{ speaker: null, text: 'fin' }], ending: true })],
    ]);
    base.game = { ...base.game, startScene: 'talk', initialState: {} };
    return base;
  }

  it('starts on the first visible line and advances one visible line per call', () => {
    const engine = new StoryEngine(linedContent());
    expect(engine.currentLine?.text).toBe('one');
    expect(engine.atLastLine).toBe(false);
    expect(engine.advance()).toBe(true);
    expect(engine.currentLine?.text).toBe('two'); // 條件未成立的 hidden 被跳過
    engine.advance();
    expect(engine.currentLine?.text).toBe('three');
    expect(engine.atLastLine).toBe(true);
  });

  it('stops at the last line when the scene waits on a choice; choosing resets to line 0 of the next scene', () => {
    const engine = new StoryEngine(linedContent());
    engine.advance(); engine.advance();
    expect(engine.advance()).toBe(false);
    expect(engine.currentScene.id).toBe('talk');
    engine.choose('go');
    expect(engine.currentScene.id).toBe('after');
    expect(engine.currentLineIndex).toBe(0);
  });

  it('advancing past the last line of a scene with next moves to the next scene; endings stop', () => {
    const engine = new StoryEngine(linedContent());
    engine.choose('go');
    expect(engine.advance()).toBe(true); // a -> b
    expect(engine.advance()).toBe(true); // b -> next scene
    expect(engine.currentScene.id).toBe('end');
    expect(engine.currentLine?.text).toBe('fin');
    expect(engine.advance()).toBe(false);
  });

  it('snapshot carries lineIndex and restore clamps it into range', () => {
    const engine = new StoryEngine(linedContent());
    engine.advance();
    expect(engine.snapshot.lineIndex).toBe(1);
    const fresh = new StoryEngine(linedContent());
    fresh.restore({ sceneId: 'talk', state: {}, lineIndex: 1 });
    expect(fresh.currentLine?.text).toBe('two');
    fresh.restore({ sceneId: 'talk', state: {}, lineIndex: 99 });
    expect(fresh.currentLine?.text).toBe('three');
    fresh.restore({ sceneId: 'talk', state: {} }); // 舊存檔沒有 lineIndex
    expect(fresh.currentLineIndex).toBe(0);
  });
});
