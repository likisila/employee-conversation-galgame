import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { parseImages } from '../src/domain/schema';
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
    // 沿著流程走：有主要選項就選下一個指定選項；只有感情線微選擇（`minor`）時任選一項
    // 帶過（不影響結局，見 property/romance-microchoices.md）；都沒有就按「繼續」，直到結局。
    for (let guard = 0; guard < 32 && !engine.currentScene.ending; guard += 1) {
      const available = engine.availableChoices;
      const majorChoices = available.filter((choice) => !choice.minor);
      if (majorChoices.length > 0) {
        const id = choices[index];
        index += 1;
        expect(majorChoices.map((choice) => choice.id), `場景 ${engine.currentScene.id} 沒有選項 ${id}`).toContain(id);
        engine.choose(id!);
      } else if (available.length > 0) {
        engine.choose(available[0].id);
      } else {
        engine.continue();
      }
    }
    expect(engine.currentScene.ending, '沒有走到結局').toBe(true);
    expect(index, '指定的選項沒有全部用到').toBe(choices.length);
    return engine;
  }

  it('uses the four approved state variables (plus narrative-memory ones) and nothing from the old prototype', () => {
    const content = loadContent();
    // trust／procedure／boundary／avoidance 決定結局；s1Memory／s7Memory 只是感情線微選擇的
    // 敘事記憶（見 tests/romanceMicrochoices.test.ts），不參與結局判定。
    expect(Object.keys(content.game.initialState).sort()).toEqual(['avoidance', 'boundary', 'procedure', 's1Memory', 's7Memory', 'trust']);
    expect(content.game.id).toBe('last-one-on-one');
    expect([...content.characters.keys()].sort()).toEqual(['lin-yucheng', 'zeng-yalin', 'zhou-yuan']);
  });

  it('TRUE END：clear invite, direct notice, admit, protect the document, advocate without asking for credit', () => {
    const engine = play(['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate']);
    expect(engine.currentScene.id).toBe('ending-true-finale');
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
    // doc-private 現在會立即終止談話並跳過 Scene 7 推薦微選擇與 Choice 5
    // （見 property/choice-and-route-revision-20260928.md「doc-private 立即終止」），
    // 因此這條路徑只走四個主要決策點，不再有 choice5。
    const engine = play(['invite-clear', 'notice-direct', 'answer-admit', 'doc-private']);
    expect(engine.currentScene.id).toBe('ending-over-line');
    const texts = engine.visibleLines.map((line) => line.text);
    expect(texts.some((text) => text.includes('不要匯錢'))).toBe(true);
    expect(texts.some((text) => text.includes('請不要私訊我'))).toBe(false);
  });

  it('doc-private 立即終止談話：不經過 Scene 7 推薦微選擇或 Choice 5', () => {
    const engine = new StoryEngine(loadContent());
    for (let guard = 0; guard < 32 && !engine.currentScene.ending; guard += 1) {
      const available = engine.availableChoices;
      const majorChoices = available.filter((choice) => !choice.minor);
      if (majorChoices.length > 0) {
        const wanted = ['invite-clear', 'notice-direct', 'answer-admit', 'doc-private'];
        const id = wanted.find((candidate) => majorChoices.some((choice) => choice.id === candidate));
        expect(id, `場景 ${engine.currentScene.id} 沒有預期的主要選項`).toBeDefined();
        engine.choose(id!);
      } else if (available.length > 0) {
        engine.choose(available[0].id);
      } else {
        engine.continue();
      }
    }
    expect(engine.currentScene.id).toBe('ending-over-line');
    // 只做四個主要決策：choice4=private 之後直接進 s7-doc-private-close，不再問 choice5。
    expect(engine.decisionPoints.map((d) => d.choiceId)).toEqual(['invite-clear', 'notice-direct', 'answer-admit', 'doc-private']);
    expect(engine.currentState.choice5).toBeUndefined();
  });

  it('體面的句點：procedure kept intact but trust falls short of TRUE END', () => {
    // 2026-09-28 效果重新設計後，answer-deflect／doc-protect／keep-credit 都是差異化的 B／A
    // 選項而非弱化選項（見 property/choice-and-route-revision-20260928.md），這組組合維持
    // procedure 高、trust 不夠 TRUE 門檻。
    const engine = play(['invite-clear', 'notice-direct', 'answer-deflect', 'doc-protect', 'keep-credit']);
    expect(engine.currentScene.id).toBe('ending-decent');
    const state = engine.currentState;
    expect(state.procedure).toBeGreaterThanOrEqual(4);
    expect(state.trust).toBeGreaterThanOrEqual(2);
    expect(state.boundary).toBeGreaterThanOrEqual(0);
    expect(state.trust).toBeLessThan(6);
  });

  it('柔軟的刀：一次明顯越界的討價還價，加上其餘普通選擇，還沒累計到越線門檻', () => {
    // 效果重新設計後，B 選項不再是「弱選項」，全 B 路線改為落在 ending-decent
    // （見上一則測試），soft-knife 現在需要至少一個 C 選項才會讓 procedure 掉到門檻以下。
    const engine = play(['invite-clear', 'notice-direct', 'answer-bargain', 'doc-pressure', 'keep-advocate']);
    expect(engine.currentScene.id).toBe('ending-soft-knife');
    expect(engine.currentState.boundary).toBeGreaterThan(-2);
  });

  it('conditional lines follow the invitation actually sent', () => {
    const engine = new StoryEngine(loadContent());
    // s1 開頭有一組感情線微選擇（不影響結局）在 s2 的邀請選項之前，任選一項帶過即可。
    for (let guard = 0; guard < 32; guard += 1) {
      const available = engine.availableChoices;
      if (available.length === 0) { engine.continue(); continue; }
      if (available.every((choice) => choice.minor)) { engine.choose(available[0].id); continue; }
      break;
    }
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
      characters: Record<string, { src?: string; expressions: Record<string, number | string> }>;
      backgrounds: Record<string, { src: string }>;
      screens: Record<string, { src: string }>;
      ui: Record<string, string>;
    };
    // 角色有兩種寫法：整張 sprite sheet（src）或逐張表情圖（expressions 的值是路徑），兩種都要檢查。
    const characterSrcs = Object.values(raw.characters).flatMap((entry) => [
      ...(entry.src ? [entry.src] : []),
      ...Object.values(entry.expressions).filter((value): value is string => typeof value === 'string'),
    ]);
    const srcs = [
      ...characterSrcs,
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
    const images = parseImages({
      characters: {},
      backgrounds: {},
      sceneBackgrounds: {},
      screens: {},
      ui: {},
      transitions: {},
      scenePresentation: {
        'cg-scene': { background: 'cg', character: null },
        'normal-scene': { background: 'room', character: 'lin-yucheng' },
      },
    });
    expect(images.scenePresentation['cg-scene']).toMatchObject({ hideCharacter: true, character: undefined });
    expect(images.scenePresentation['normal-scene']).toMatchObject({ hideCharacter: undefined, character: 'lin-yucheng' });
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
