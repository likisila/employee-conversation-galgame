import { describe, expect, it } from 'vitest';
import { StoryEngine } from '../src/engine/StoryEngine';
import type { LoadedContent } from '../src/data/contentLoader';
import type { Line, Scene } from '../src/domain/schema';

function lines(...texts: string[]): Line[] {
  return texts.map((text) => ({ speaker: null, text }));
}

function scene(id: string, partial: Partial<Scene> = {}): Scene {
  return { id, lines: [], choices: [], ...partial };
}

/**
 * s1（兩句＋兩個選項）→ s2（一句＋兩個選項）→ 依 boundary 分兩個結局。
 * 兩個決策點才測得出「回到第一個決策點時，第二個決策點也要跟著作廢」。
 */
function makeContent(): LoadedContent {
  const scenes = new Map<string, Scene>([
    ['s1', scene('s1', {
      title: '第一場',
      lines: lines('a1', 'a2'),
      choices: [
        { id: 'kind', text: '好好說', next: 's2', effects: [{ variable: 'boundary', operation: 'add', value: 1 }] },
        { id: 'harsh', text: '直接說', next: 's2', effects: [{ variable: 'boundary', operation: 'add', value: -1 }] },
      ],
    })],
    ['s2', scene('s2', {
      title: '第二場',
      lines: lines('b1'),
      choices: [
        { id: 'stay', text: '留下來', next: 'route', effects: [{ variable: 'boundary', operation: 'add', value: 1 }] },
        { id: 'leave', text: '離開', next: 'route', effects: [{ variable: 'boundary', operation: 'add', value: -1 }] },
      ],
    })],
    ['route', scene('route', {
      route: [
        { conditions: [{ variable: 'boundary', operator: 'gte', value: 2 }], next: 'good' },
        { next: 'bad' },
      ],
    })],
    ['good', scene('good', { title: 'GOOD', lines: lines('g1'), ending: true })],
    ['bad', scene('bad', { title: 'BAD', lines: lines('x1'), ending: true })],
  ]);
  return {
    manifest: { game: 'game.json', characters: 'characters.json', scenes: [] },
    game: { id: 'test-game', title: 'Test', startScene: 's1', initialState: { boundary: 0 } },
    characters: new Map(),
    scenes,
    ui: {
      choicePrompt: '', continueLabel: '', restartLabel: '', narratorName: '',
      startLabel: '', loadingLabel: '', subtitle: '', resumeLabel: '', newGameLabel: '',
      playerLabel: '', tapToContinueLabel: '', backLabel: '',
      skipCutsceneLabel: '', muteCutsceneLabel: '', cutsceneLabel: '',
      rewindLabel: '', rewindPrompt: '', rewindChoiceLabel: '', rewindCloseLabel: '',
    },
    images: { characters: {}, backgrounds: {}, sceneBackgrounds: {}, screens: {}, ui: {}, transitions: {}, scenePresentation: {} },
    cutscenes: { missingAssetBehavior: 'skip-video-and-enter-canonical-scene' },
    cutsceneCues: new Map(),
  };
}

/** 一路選到 GOOD 結局（兩次都選加分的那一項）。 */
function playToGoodEnding(engine: StoryEngine): void {
  engine.advance(); // a2（選項頁）
  engine.choose('kind');
  engine.choose('stay');
}

describe('通關後回到決策點', () => {
  it('還沒做過選擇時沒有任何決策點', () => {
    const engine = new StoryEngine(makeContent());
    expect(engine.decisionPoints).toEqual([]);
    expect(engine.rewindTo(0)).toBe(false);
  });

  it('每做一次選擇就記下一個決策點：場景、停在哪一句與選擇前的狀態', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    expect(engine.currentScene.id).toBe('good');
    expect(engine.decisionPoints).toEqual([
      { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
      { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: 'stay' },
    ]);
  });

  it('回到決策點：場景、句子與狀態都回到按下選項之前', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    expect(engine.rewindTo(1)).toBe(true);
    expect(engine.currentScene.id).toBe('s2');
    expect(engine.currentLine?.text).toBe('b1');
    expect(engine.currentState.boundary).toBe(1);
    expect(engine.availableChoices.map((choice) => choice.id)).toEqual(['stay', 'leave']);
  });

  it('回到較早的決策點時，之後的決策紀錄一併作廢', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    expect(engine.rewindTo(0)).toBe(true);
    expect(engine.decisionPoints).toEqual([]);
    expect(engine.currentScene.id).toBe('s1');
    expect(engine.currentLineIndex).toBe(1);
    expect(engine.currentState.boundary).toBe(0);
  });

  it('回去改選另一項會走到另一個結局，決策紀錄依新路線重建', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    engine.rewindTo(1);
    engine.choose('leave');
    expect(engine.currentScene.id).toBe('bad');
    expect(engine.currentState.boundary).toBe(0);
    expect(engine.decisionPoints).toEqual([
      { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
      { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: 'leave' },
    ]);
  });

  it('回到決策點之後不能再一句一句退回已作廢的那條路', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    engine.rewindTo(1);
    expect(engine.canGoBack).toBe(false);
    expect(engine.back()).toBe(false);
    expect(engine.currentScene.id).toBe('s2');
  });

  it('索引不合法時不動作', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    for (const index of [-1, 2, 1.5, Number.NaN]) {
      expect(engine.rewindTo(index)).toBe(false);
    }
    expect(engine.currentScene.id).toBe('good');
    expect(engine.decisionPoints).toHaveLength(2);
  });

  it('回到決策點不會讓已看過的過場影片重播（那是「重新開始」才做的事）', () => {
    const engine = new StoryEngine(makeContent());
    engine.markCutsceneWatched('cut-01');
    playToGoodEnding(engine);
    engine.rewindTo(0);
    expect(engine.hasWatchedCutscene('cut-01')).toBe(true);
    engine.restart();
    expect(engine.hasWatchedCutscene('cut-01')).toBe(false);
  });

  it('重新開始會清空決策點', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    engine.restart();
    expect(engine.decisionPoints).toEqual([]);
  });

  it('決策點進得了快照，讀檔後仍然回得去', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    const snapshot = engine.snapshot;
    expect(snapshot.decisions).toHaveLength(2);

    const reloaded = new StoryEngine(makeContent());
    reloaded.restore(snapshot);
    expect(reloaded.currentScene.id).toBe('good');
    expect(reloaded.decisionPoints).toEqual(snapshot.decisions);
    expect(reloaded.rewindTo(0)).toBe(true);
    expect(reloaded.currentScene.id).toBe('s1');
  });

  it('外部改動 decisionPoints 回傳值不會影響引擎', () => {
    const engine = new StoryEngine(makeContent());
    playToGoodEnding(engine);
    const copy = engine.decisionPoints;
    copy[0].choiceId = 'harsh';
    copy[0].state.boundary = 99;
    expect(engine.decisionPoints[0]).toEqual({ sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' });
  });

  it('決策場景後來增加台詞時，對不上的紀錄會被修正成新的位置', () => {
    // 內容改版：s1 多了一句，原本記在 index 1 的決策點已經不是選項頁。
    const content = makeContent();
    content.scenes.get('s1')!.lines.push({ speaker: null, text: 'a3（改版後新增）' });
    const engine = new StoryEngine(content);
    engine.restore({
      sceneId: 'good',
      state: { boundary: 2 },
      decisions: [
        { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
        { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: 'stay' },
      ],
    });
    // 對不上的紀錄先被截斷，接著由狀態反推出同一條路徑，s1 的句子指到改版後的最後一句。
    expect(engine.decisionPoints).toEqual([
      { sceneId: 's1', lineIndex: 2, state: { boundary: 0 }, choiceId: 'kind' },
      { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: 'stay' },
    ]);

    // 改版後才存的紀錄指向新的最後一句，仍然有效。
    const afterUpdate = new StoryEngine(content);
    afterUpdate.restore({
      sceneId: 'good',
      state: { boundary: 2 },
      decisions: [{ sceneId: 's1', lineIndex: 2, state: { boundary: 0 }, choiceId: 'kind' }],
    });
    expect(afterUpdate.decisionPoints).toHaveLength(1);
    expect(afterUpdate.rewindTo(0)).toBe(true);
    expect(afterUpdate.currentLine?.text).toBe('a3（改版後新增）');
    expect(afterUpdate.availableChoices.map((choice) => choice.id)).toEqual(['kind', 'harsh']);
  });

  it('選項條件改成在當時狀態下不可選時，該筆紀錄失效', () => {
    // 內容改版：kind 現在要 boundary >= 1 才出得來，但紀錄裡按下它時是 0。
    const content = makeContent();
    content.scenes.get('s1')!.choices[0].conditions = [{ variable: 'boundary', operator: 'gte', value: 1 }];
    const engine = new StoryEngine(content);
    engine.restore({
      sceneId: 'good',
      state: { boundary: 2 },
      decisions: [
        { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
        { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: 'stay' },
      ],
    });
    expect(engine.decisionPoints).toEqual([]);

    // 條件在紀錄的狀態下成立時照常保留。
    const stillValid = new StoryEngine(content);
    stillValid.restore({
      sceneId: 'good',
      state: { boundary: 2 },
      decisions: [{ sceneId: 's1', lineIndex: 1, state: { boundary: 1 }, choiceId: 'kind' }],
    });
    expect(stillValid.decisionPoints).toHaveLength(1);
  });

  it('存檔裡對不上內容的決策紀錄從該筆起截斷', () => {
    const engine = new StoryEngine(makeContent());
    engine.restore({
      sceneId: 'good',
      state: { boundary: 2 },
      decisions: [
        { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
        { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: '已被刪掉的選項' },
        { sceneId: 's1', lineIndex: 0, state: { boundary: 0 }, choiceId: 'harsh' },
      ],
    });
    expect(engine.decisionPoints).toEqual([
      { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
    ]);
  });
});

describe('舊存檔（沒有決策紀錄）的路徑反推', () => {
  it('從存檔狀態反推出這一輪走過的決策點，不必重玩', () => {
    // 更新前的存檔：停在結局、狀態完整，但沒有 decisions 欄位。
    const engine = new StoryEngine(makeContent());
    engine.restore({ sceneId: 'good', state: { boundary: 2 }, lineIndex: 0 });
    expect(engine.decisionPoints).toEqual([
      { sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' },
      { sceneId: 's2', lineIndex: 0, state: { boundary: 1 }, choiceId: 'stay' },
    ]);
  });

  it('反推出來的決策點可以直接跳回去重選', () => {
    const engine = new StoryEngine(makeContent());
    engine.restore({ sceneId: 'good', state: { boundary: 2 }, lineIndex: 0 });
    expect(engine.rewindTo(1)).toBe(true);
    expect(engine.currentScene.id).toBe('s2');
    expect(engine.currentState.boundary).toBe(1);
    engine.choose('leave');
    expect(engine.currentScene.id).toBe('bad');
  });

  it('反推結果與實際遊玩記下來的一模一樣', () => {
    const played = new StoryEngine(makeContent());
    playToGoodEnding(played);
    const rebuilt = new StoryEngine(makeContent());
    // 拿掉 decisions，模擬舊版本存下來的快照。
    const { decisions, ...legacy } = played.snapshot;
    expect(decisions).toHaveLength(2);
    rebuilt.restore(legacy);
    expect(rebuilt.decisionPoints).toEqual(played.decisionPoints);
  });

  it('同一個狀態對得上兩條路徑時不反推，寧可不顯示也不列出沒做過的選擇', () => {
    // s1 的兩個選項改成效果相同：走哪一條，最後的狀態都一樣。
    const content = makeContent();
    content.scenes.get('s1')!.choices[1].effects = [{ variable: 'boundary', operation: 'add', value: 1 }];
    const engine = new StoryEngine(content);
    engine.restore({ sceneId: 'good', state: { boundary: 2 }, lineIndex: 0 });
    expect(engine.decisionPoints).toEqual([]);
  });

  it('狀態對不上任何一條路徑時不反推', () => {
    const engine = new StoryEngine(makeContent());
    engine.restore({ sceneId: 'good', state: { boundary: 99 }, lineIndex: 0 });
    expect(engine.decisionPoints).toEqual([]);
  });

  it('存檔已經有有效的決策紀錄時，直接沿用而不反推', () => {
    const engine = new StoryEngine(makeContent());
    engine.restore({
      sceneId: 'good',
      state: { boundary: 2 },
      decisions: [{ sceneId: 's1', lineIndex: 1, state: { boundary: 0 }, choiceId: 'kind' }],
    });
    expect(engine.decisionPoints).toHaveLength(1);
  });

  it('還沒做過選擇的存檔反推出空清單，不影響讀檔', () => {
    const engine = new StoryEngine(makeContent());
    engine.restore({ sceneId: 's1', state: { boundary: 0 }, lineIndex: 0 });
    expect(engine.decisionPoints).toEqual([]);
    expect(engine.currentScene.id).toBe('s1');
  });
});
