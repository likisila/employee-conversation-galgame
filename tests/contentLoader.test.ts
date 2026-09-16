import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';

// 這個測試實際載入 property/ 內容，等同遊戲啟動時 loadContent() 的行為。
// 若內容（manifest / scenes / images）出現會讓執行期崩潰的不一致，這裡就會失敗，
// 避免「build 綠燈但線上黑畫面」再次發生。
describe('loadContent (real property content)', () => {
  it('loads without throwing and exposes the start scene', () => {
    const content = loadContent();
    expect(content.scenes.size).toBeGreaterThan(0);
    expect(content.scenes.has(content.game.startScene)).toBe(true);
  });

  it('every manifest scene, choice target, scene.next and route target resolves', () => {
    const content = loadContent();
    for (const scene of content.scenes.values()) {
      if (scene.next) expect(content.scenes.has(scene.next)).toBe(true);
      for (const choice of scene.choices) expect(content.scenes.has(choice.next)).toBe(true);
      for (const entry of scene.route ?? []) expect(content.scenes.has(entry.next)).toBe(true);
    }
  });

  it('every scene the player can stop on has a way forward (choices, next, or is an ending)', () => {
    const content = loadContent();
    for (const scene of content.scenes.values()) {
      if (scene.route) continue; // 純路由節點由引擎自動跳過
      const hasExit = scene.ending === true || scene.choices.length > 0 || scene.next !== undefined;
      expect(hasExit, `場景 ${scene.id} 沒有出口`).toBe(true);
    }
  });

  it('every routing scene ends with an unconditional default entry', () => {
    const content = loadContent();
    for (const scene of content.scenes.values()) {
      if (!scene.route) continue;
      const last = scene.route[scene.route.length - 1];
      expect(last?.conditions ?? [], `路由場景 ${scene.id} 缺少預設路徑`).toHaveLength(0);
    }
  });
});

// 依 HANDOFF-20260916-layoff-story-integration 的驗證要求：
// 四個結局各至少一條可達路徑，且優先序為 越線 → TRUE END → 體面的句點 → 柔軟的刀。
describe('《最後一次一對一》ending reachability', () => {
  function play(choices: string[]): StoryEngine {
    const engine = new StoryEngine(loadContent());
    let index = 0;
    // 沿著流程走：有選項就選下一個指定選項，否則按「繼續」，直到結局。
    for (let guard = 0; guard < 32 && !engine.currentScene.ending; guard += 1) {
      if (engine.availableChoices.length > 0) {
        const id = choices[index];
        index += 1;
        expect(engine.availableChoices.map((choice) => choice.id), `場景 ${engine.currentScene.id} 沒有選項 ${id}`).toContain(id);
        engine.choose(id!);
      } else {
        engine.continue();
      }
    }
    expect(engine.currentScene.ending, '沒有走到結局').toBe(true);
    expect(index, '指定的選項沒有全部用到').toBe(choices.length);
    return engine;
  }

  it('uses the four approved state variables and nothing from the old prototype', () => {
    const content = loadContent();
    expect(Object.keys(content.game.initialState).sort()).toEqual(['avoidance', 'boundary', 'procedure', 'trust']);
    expect(content.game.id).toBe('last-one-on-one');
    expect([...content.characters.keys()].sort()).toEqual(['lin-yucheng', 'zeng-yalin', 'zhou-yuan']);
  });

  it('TRUE END：clear invite, direct notice, admit, protect the document, advocate without asking for credit', () => {
    const engine = play(['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate']);
    expect(engine.currentScene.id).toBe('ending-true');
    const state = engine.currentState;
    expect(state.trust).toBeGreaterThanOrEqual(6);
    expect(state.procedure).toBeGreaterThanOrEqual(4);
    expect(state.boundary).toBeGreaterThanOrEqual(2);
    expect(state.avoidance).toBeLessThanOrEqual(1);
  });

  it('越線 takes priority over every other ending once boundary <= -2, even on an otherwise perfect run', () => {
    const engine = play(['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-confess']);
    expect(engine.currentScene.id).toBe('ending-over-line');
    expect(engine.currentState.boundary).toBeLessThanOrEqual(-2);
    // 只顯示告白路線的專屬台詞，不顯示私下補償路線的
    const texts = engine.visibleLines.map((line) => line.text);
    expect(texts.some((text) => text.includes('推薦信和作品申請請改由其他人處理'))).toBe(true);
    expect(texts.some((text) => text.includes('不要匯錢'))).toBe(false);
  });

  it('越線 via the private-compensation offer shows that branch\'s line instead', () => {
    const engine = play(['invite-clear', 'notice-direct', 'answer-admit', 'doc-private', 'keep-credit']);
    expect(engine.currentScene.id).toBe('ending-over-line');
    const texts = engine.visibleLines.map((line) => line.text);
    expect(texts.some((text) => text.includes('不要匯錢'))).toBe(true);
    expect(texts.some((text) => text.includes('請不要私訊我'))).toBe(false);
  });

  it('體面的句點：procedure kept intact but trust falls short of TRUE END', () => {
    const engine = play(['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-credit']);
    expect(engine.currentScene.id).toBe('ending-decent');
    const state = engine.currentState;
    expect(state.procedure).toBeGreaterThanOrEqual(4);
    expect(state.trust).toBeGreaterThanOrEqual(2);
    expect(state.boundary).toBeGreaterThanOrEqual(0);
    expect(state.trust).toBeLessThan(6);
  });

  it('柔軟的刀：a run of euphemism and pressure that never crosses the line', () => {
    const engine = play(['invite-vague', 'notice-euphemism', 'answer-deflect', 'doc-pressure', 'keep-credit']);
    expect(engine.currentScene.id).toBe('ending-soft-knife');
    expect(engine.currentState.boundary).toBeGreaterThan(-2);
  });

  it('conditional lines follow the invitation actually sent', () => {
    const engine = new StoryEngine(loadContent());
    while (engine.availableChoices.length === 0) engine.continue();
    engine.choose('invite-goodnews');
    const texts = engine.visibleLines.map((line) => line.text);
    expect(texts.some((text) => text.includes('好消息？'))).toBe(true);
    expect(texts.some((text) => text.includes('我把檔案存好了'))).toBe(false);
  });
});

// 素材路徑只在 runtime 才會 404，測試在這裡先擋：images.json 引用的每個檔案都必須存在於 public/。
describe('image assets referenced by property/images.json exist on disk', () => {
  it('every sprite, background, screen and ui src resolves to a file under public/', () => {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'property', 'images.json'), 'utf8')) as {
      characters: Record<string, { src: string }>;
      backgrounds: Record<string, { src: string }>;
      screens: Record<string, { src: string }>;
      ui: Record<string, string>;
    };
    const srcs = [
      ...Object.values(raw.characters).map((entry) => entry.src),
      ...Object.values(raw.backgrounds).map((entry) => entry.src),
      ...Object.values(raw.screens).map((entry) => entry.src),
      ...Object.values(raw.ui),
    ];
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(existsSync(join(__dirname, '..', 'public', src)), `${src} 不存在`).toBe(true);
    }
  });

  it('"character": null in scenePresentation parses as hideCharacter (CG scenes show no sprite)', () => {
    const content = loadContent();
    const cgScenes = Object.entries(content.images.scenePresentation).filter(([, p]) => p.hideCharacter);
    expect(cgScenes.map(([id]) => id).sort()).toEqual(['ending-over-line', 'ending-true']);
    for (const [, p] of cgScenes) expect(p.character).toBeUndefined();
  });

  it('every sprite sheet declares frameAspectRatio so the renderer never distorts it', () => {
    const content = loadContent();
    for (const [id, sheet] of Object.entries(content.images.characters)) {
      expect(sheet.frameAspectRatio, `${id} 缺 frameAspectRatio`).toBeGreaterThan(0);
    }
  });
});

describe('active property/ no longer carries the junior-one-on-one prototype', () => {
  it('has no references to 小林 / 資淺同仁 / old state variables in loaded content files', () => {
    const root = join(__dirname, '..', 'property');
    const files = ['game.json', 'characters.json', 'ui.json', 'images.json', 'manifest.json',
      ...readdirSync(join(root, 'scenes')).map((name) => join('scenes', name))];
    const forbidden = /小林|資淺|三個月|junior-one-on-one|psychologicalSafety|ownership|clarity/;
    for (const file of files) {
      const text = readFileSync(join(root, file), 'utf8');
      expect(forbidden.test(text), `${file} 仍含舊原型設定`).toBe(false);
    }
  });
});
