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
      startLabel: '', loadingLabel: '', subtitle: '', resumeLabel: '', newGameLabel: '',
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
    expect(engine.snapshot).toEqual(target);
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
