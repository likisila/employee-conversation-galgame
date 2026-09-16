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
