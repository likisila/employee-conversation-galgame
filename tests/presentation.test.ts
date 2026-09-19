import { describe, expect, it } from 'vitest';
import { parseLine, type Line } from '../src/domain/schema';
import { resolveCharacterFraming, resolvePresentation } from '../src/ui/presentation';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';
import { isLineVisible } from '../src/engine/rules';

const SPRITES = new Set(['lin-yucheng', 'zeng-yalin', 'zhou-yuan']);
const context = (presentation?: Parameters<typeof resolvePresentation>[2]['presentation'], sceneBackground?: string) => ({
  presentation,
  sceneBackground,
  hasSprite: (id: string) => SPRITES.has(id),
});

const line = (raw: Record<string, unknown>): Line => parseLine({ speaker: null, text: 'x', ...raw });

describe('resolvePresentation', () => {
  it('falls back to the scene background and scene character', () => {
    const lines = [line({}), line({})];
    expect(resolvePresentation(lines, 1, context({ background: 'room' }, 'ignored'))).toEqual({
      backgroundId: 'room',
      characterId: undefined,
    });
    expect(resolvePresentation(lines, 1, context({ character: 'zeng-yalin' }, 'room'))).toEqual({
      backgroundId: 'room',
      characterId: 'zeng-yalin',
    });
  });

  it('follows the last speaker who has a sprite', () => {
    const lines = [line({ speaker: 'lin-yucheng', text: 'a' }), line({}), line({ speaker: 'zeng-yalin', text: 'b' })];
    expect(resolvePresentation(lines, 1, context()).characterId).toBe('lin-yucheng');
    expect(resolvePresentation(lines, 2, context()).characterId).toBe('zeng-yalin');
  });

  it('ignores speakers without a sprite', () => {
    const lines = [line({ speaker: 'lin-yucheng', text: 'a' }), line({ speaker: 'ceo', text: 'b' })];
    expect(resolvePresentation(lines, 1, context()).characterId).toBe('lin-yucheng');
  });

  it('switches the background from the line that declares it, and keeps it afterwards', () => {
    const lines = [line({}), line({ background: 'night' }), line({}), line({ background: 'cafe' })];
    expect(resolvePresentation(lines, 0, context(undefined, 'room')).backgroundId).toBe('room');
    expect(resolvePresentation(lines, 1, context(undefined, 'room')).backgroundId).toBe('night');
    expect(resolvePresentation(lines, 2, context(undefined, 'room')).backgroundId).toBe('night');
    expect(resolvePresentation(lines, 3, context(undefined, 'room')).backgroundId).toBe('cafe');
  });

  it('keeps a line-level character: null in effect for later speakers (角色已離場)', () => {
    const lines = [
      line({ speaker: 'lin-yucheng', text: 'a' }),
      line({ character: null, text: '門關上。' }),
      line({ speaker: 'lin-yucheng', text: 'b' }),
    ];
    expect(resolvePresentation(lines, 0, context()).characterId).toBe('lin-yucheng');
    expect(resolvePresentation(lines, 1, context()).characterId).toBeUndefined();
    expect(resolvePresentation(lines, 2, context()).characterId).toBeUndefined();
  });

  it('lets a later line-level character bring someone back', () => {
    const lines = [line({ character: null }), line({ character: 'zeng-yalin' }), line({})];
    expect(resolvePresentation(lines, 1, context()).characterId).toBe('zeng-yalin');
    expect(resolvePresentation(lines, 2, context()).characterId).toBe('zeng-yalin');
  });

  it('overrides a scene-wide character: null (CG 場景需要時仍能指定立繪)', () => {
    const lines = [line({ speaker: 'lin-yucheng', text: 'a' }), line({ character: 'lin-yucheng' })];
    const hidden = context({ hideCharacter: true });
    expect(resolvePresentation(lines, 0, hidden).characterId).toBeUndefined();
    expect(resolvePresentation(lines, 1, hidden).characterId).toBe('lin-yucheng');
  });
});

describe('real content presentation', () => {
  it('每一句的背景與立繪都指向存在的資產', () => {
    const content = loadContent();
    for (const scene of content.scenes.values()) {
      for (let index = 0; index < scene.lines.length; index += 1) {
        const { backgroundId, characterId } = resolvePresentation(scene.lines, index, {
          presentation: content.images.scenePresentation[scene.id],
          sceneBackground: content.images.sceneBackgrounds[scene.id],
          hasSprite: (id) => content.images.characters[id] !== undefined,
        });
        if (backgroundId) expect(content.images.backgrounds[backgroundId], `${scene.id}[${index}] ${backgroundId}`).toBeDefined();
        if (characterId) expect(content.images.characters[characterId], `${scene.id}[${index}] ${characterId}`).toBeDefined();
      }
    }
  });

  it('結局開場仍在會議室：第一句的背景不是後段才發生的 CG', () => {
    const content = loadContent();
    for (const scene of content.scenes.values()) {
      if (!scene.ending) continue;
      const first = resolvePresentation(scene.lines, 0, {
        presentation: content.images.scenePresentation[scene.id],
        sceneBackground: content.images.sceneBackgrounds[scene.id],
        hasSprite: (id) => content.images.characters[id] !== undefined,
      });
      expect(first.backgroundId, `${scene.id} 的開場背景`).toBe('moon-meeting-room-rain');
    }
  });

  it('沒有背景圖在 images.json 定義卻從未被任何場景使用', () => {
    const content = loadContent();
    const used = new Set<string>(Object.values(content.images.sceneBackgrounds));
    for (const presentation of Object.values(content.images.scenePresentation)) {
      if (presentation.background) used.add(presentation.background);
    }
    for (const scene of content.scenes.values()) {
      for (const line of scene.lines) if (line.background) used.add(line.background);
    }
    const unused = Object.keys(content.images.backgrounds).filter((id) => !used.has(id));
    expect(unused, `未被使用的背景：${unused.join(', ')}`).toHaveLength(0);
  });

  it('TRUE END 的時間跳躍會換景（會議室 → 住處 → 咖啡店）', () => {
    const content = loadContent();
    const scene = content.scenes.get('ending-true');
    expect(scene).toBeDefined();
    const engine = new StoryEngine(content);
    const backgrounds = scene!.lines.map((_, index) =>
      resolvePresentation(scene!.lines, index, {
        presentation: content.images.scenePresentation['ending-true'],
        sceneBackground: content.images.sceneBackgrounds['ending-true'],
        hasSprite: (id) => content.images.characters[id] !== undefined,
      }).backgroundId,
    );
    expect([...new Set(backgrounds)]).toEqual([
      'moon-meeting-room-rain',
      'apartment-phone-night',
      'platform-zero-cafe',
      'cg-true-reflection',
    ]);
    expect(engine.currentScene.id).toBe(content.game.startScene);
  });
});

describe('s4／s6 文件特寫分鏡（property/VISUALS.md）', () => {
  // 以會議室人物鏡頭為主，資料夾 CG 只出現在指定的那一句；下一句回會議室並恢復說話者立繪。
  const cases = [
    { sceneId: 's4-notice', closeUp: '藍色資料夾特寫', states: ['direct', 'euphemism', 'performance'].map((choice2) => ({ choice2 })) },
    { sceneId: 's6-receipt', closeUp: '雅琳把藍色資料夾轉向雨澄', states: [{}] },
  ];

  for (const { sceneId, closeUp, states } of cases) {
    for (const state of states) {
      it(`${sceneId} ${JSON.stringify(state)}：只有特寫那句是 CG，其餘每句都在會議室且有人物`, () => {
        const content = loadContent();
        const presentation = content.images.scenePresentation[sceneId];
        const lines = content.scenes.get(sceneId)!.lines.filter((line) => isLineVisible(line, state));
        const shots = lines.map((line, index) => {
          const { backgroundId, characterId } = resolvePresentation(lines, index, {
            presentation,
            sceneBackground: content.images.sceneBackgrounds[sceneId],
            hasSprite: (id) => content.images.characters[id] !== undefined,
          });
          const framing = resolveCharacterFraming(presentation, backgroundId ? content.images.backgrounds[backgroundId] : undefined);
          return { line, backgroundId, shown: framing === 'none' ? undefined : characterId };
        });

        const cg = shots.findIndex((shot) => shot.backgroundId === 'cg-rights-packet');
        expect(shots.filter((shot) => shot.backgroundId === 'cg-rights-packet')).toHaveLength(1);
        expect(shots[cg].line.text).toContain(closeUp);
        expect(shots[cg].shown).toBeUndefined();
        // 特寫後的下一句立刻回到說話者。
        expect(shots[cg + 1].shown).toBe(shots[cg + 1].line.speaker);

        shots.forEach((shot, index) => {
          if (index === cg) return;
          expect(shot.backgroundId, `${sceneId}[${index}]`).toBe('moon-meeting-room-rain');
          expect(shot.shown, `${sceneId}[${index}] 應有人物`).toBeDefined();
          if (shot.line.speaker && content.images.characters[shot.line.speaker]) {
            expect(shot.shown, `${sceneId}[${index}] 立繪應跟著說話者`).toBe(shot.line.speaker);
          }
        });
      });
    }
  }
});
