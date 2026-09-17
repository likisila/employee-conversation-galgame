import { describe, expect, it } from 'vitest';
import { parseImages } from '../src/domain/schema';
import { resolveCharacterFraming } from '../src/ui/presentation';

function parse(raw: Record<string, unknown>) {
  return parseImages({ characters: {}, screens: {}, sceneBackgrounds: {}, ui: {}, transitions: {}, scenePresentation: {}, backgrounds: {}, ...raw });
}

describe('角色取景設定', () => {
  it('背景可以宣告取景，沒宣告就是 undefined（由呼叫端當成 full）', () => {
    const { backgrounds } = parse({
      backgrounds: {
        wide: { src: '/a.webp', alt: 'wide' },
        close: { src: '/b.webp', alt: 'close', characterFraming: 'upper-body' },
        cg: { src: '/c.webp', alt: 'cg', characterFraming: 'none' },
      },
    });
    expect(backgrounds.wide.characterFraming).toBeUndefined();
    expect(backgrounds.close.characterFraming).toBe('upper-body');
    expect(backgrounds.cg.characterFraming).toBe('none');
  });

  it('未知的取景值直接報錯，不會默默套成預設', () => {
    expect(() => parse({ backgrounds: { x: { src: '/a.webp', alt: 'x', characterFraming: 'bust' } } }))
      .toThrow(/characterFraming/);
  });

  it('場景可以覆寫背景的取景（分鏡例外）', () => {
    const { scenePresentation } = parse({ scenePresentation: { s1: { background: 'close', characterFraming: 'full' } } });
    expect(scenePresentation.s1.characterFraming).toBe('full');
  });

  it('優先序：場景覆寫 → 背景設定 → 預設 full', () => {
    const background = { src: '/b.webp', alt: 'close', characterFraming: 'upper-body' as const };
    expect(resolveCharacterFraming(undefined, background)).toBe('upper-body');
    expect(resolveCharacterFraming({ characterFraming: 'full' }, background)).toBe('full');
    expect(resolveCharacterFraming(undefined, { src: '/a.webp', alt: 'wide' })).toBe('full');
    expect(resolveCharacterFraming(undefined, undefined)).toBe('full');
  });
});

describe('正式內容的取景對應', () => {
  it('會議室近景為上半身、劇情 CG 不疊立繪、寬景維持全身', async () => {
    const images = (await import('../property/images.json')).default as Parameters<typeof parseImages>[0];
    const { backgrounds } = parseImages(images);
    expect(backgrounds['moon-meeting-room-rain'].characterFraming).toBe('upper-body');
    for (const cg of ['cg-rights-packet', 'cg-badge-flip', 'cg-true-reflection']) {
      expect(backgrounds[cg].characterFraming, `${cg} 應不疊立繪`).toBe('none');
    }
    for (const wide of ['weiguang-office-rain-dusk', 'rainy-arcade-night', 'apartment-phone-night', 'platform-zero-cafe']) {
      expect(resolveCharacterFraming(undefined, backgrounds[wide]), `${wide} 應為全身`).toBe('full');
    }
  });

  it('所有用會議室背景的場景都會拿到上半身取景（不靠 scene id 寫死）', async () => {
    const images = (await import('../property/images.json')).default as Parameters<typeof parseImages>[0];
    const { backgrounds, sceneBackgrounds, scenePresentation } = parseImages(images);
    const meetingScenes = Object.entries(sceneBackgrounds)
      .filter(([, backgroundId]) => backgroundId === 'moon-meeting-room-rain')
      .map(([sceneId]) => sceneId);
    expect(meetingScenes.length).toBeGreaterThanOrEqual(4);
    for (const sceneId of meetingScenes) {
      const framing = resolveCharacterFraming(scenePresentation[sceneId], backgrounds['moon-meeting-room-rain']);
      expect(framing, `${sceneId} 應為 upper-body`).toBe('upper-body');
    }
  });
});
