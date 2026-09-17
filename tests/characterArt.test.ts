import { describe, expect, it } from 'vitest';
import { parseImages } from '../src/domain/schema';
import { resolveCatalogAssets } from '../src/data/assetPath';
import { spriteSource } from '../src/ui/presentation';

const sheetCharacter = {
  src: '/assets/characters/sheet.png',
  alt: 'sheet',
  columns: 3,
  frameAspectRatio: 1,
  defaultExpression: 'neutral',
  expressions: { neutral: 0, stop: 1, dry: 2 },
};

const fileCharacter = {
  alt: 'full body',
  frameAspectRatio: 0.6667,
  defaultExpression: 'neutral',
  expressions: {
    neutral: '/assets/characters/full-body/x-neutral.png',
    alert: '/assets/characters/full-body/x-alert.png',
  },
  align: 'left',
};

function parse(characters: Record<string, unknown>) {
  return parseImages({ characters, backgrounds: {}, screens: {}, sceneBackgrounds: {}, ui: {}, transitions: {}, scenePresentation: {} });
}

describe('角色立繪的兩種素材寫法', () => {
  it('sprite sheet：畫格索引照舊，不產生 sources', () => {
    const { characters } = parse({ a: sheetCharacter });
    expect(characters.a.columns).toBe(3);
    expect(characters.a.expressions).toEqual({ neutral: 0, stop: 1, dry: 2 });
    expect(characters.a.sources).toBeUndefined();
    expect(spriteSource(characters.a, 'dry')).toBe('/assets/characters/sheet.png');
  });

  it('逐張圖：每個表情各自一張，columns 為 1、畫格恆為 0', () => {
    const { characters } = parse({ x: fileCharacter });
    expect(characters.x.columns).toBe(1);
    expect(characters.x.expressions).toEqual({ neutral: 0, alert: 0 });
    expect(characters.x.sources).toEqual(fileCharacter.expressions);
    expect(characters.x.align).toBe('left');
    expect(characters.x.frameAspectRatio).toBeCloseTo(0.6667);
  });

  it('逐張圖：依表情取圖，未知表情退回預設表情那一張', () => {
    const { characters } = parse({ x: fileCharacter });
    expect(spriteSource(characters.x, 'alert')).toBe('/assets/characters/full-body/x-alert.png');
    expect(spriteSource(characters.x, 'neutral')).toBe('/assets/characters/full-body/x-neutral.png');
    expect(spriteSource(characters.x, '不存在的表情')).toBe('/assets/characters/full-body/x-neutral.png');
    expect(spriteSource(characters.x, undefined)).toBe('/assets/characters/full-body/x-neutral.png');
  });

  it('部署在子路徑時，逐張圖的每個表情都會被解析（並換成交付用的 WebP）', () => {
    const catalog = resolveCatalogAssets(parse({ x: fileCharacter }), '/employee-conversation-galgame/');
    expect(catalog.characters.x.sources).toEqual({
      neutral: '/employee-conversation-galgame/assets/characters/web/x-neutral.webp',
      alert: '/employee-conversation-galgame/assets/characters/web/x-alert.webp',
    });
    expect(catalog.characters.x.src).toBe('/employee-conversation-galgame/assets/characters/web/x-neutral.webp');
  });

  it('不可混用畫格索引與圖片路徑', () => {
    expect(() => parse({ x: { ...fileCharacter, expressions: { neutral: '/a.png', alert: 1 } } })).toThrow(/混用/);
  });

  it('逐張圖缺少預設表情時直接報錯', () => {
    expect(() => parse({ x: { ...fileCharacter, defaultExpression: 'missing' } })).toThrow(/defaultExpression/);
  });

  it('表情不可為空', () => {
    expect(() => parse({ x: { ...fileCharacter, expressions: {} } })).toThrow(/不可為空/);
  });
});

describe('正式素材', () => {
  it('三位角色都改用全身逐張圖，且每個表情都有自己的檔案', async () => {
    const images = (await import('../property/images.json')).default as Parameters<typeof parseImages>[0];
    const { characters } = parseImages(images);
    for (const [id, sheet] of Object.entries(characters)) {
      expect(sheet.sources, `${id} 應使用逐張表情圖`).toBeDefined();
      expect(sheet.columns).toBe(1);
      const unique = new Set(Object.values(sheet.sources!));
      expect(unique.size, `${id} 的每個表情應該是不同的檔案`).toBe(Object.keys(sheet.sources!).length);
    }
    expect(Object.keys(characters['lin-yucheng'].sources!)).toHaveLength(6);
    expect(Object.keys(characters['zeng-yalin'].sources!)).toHaveLength(3);
    expect(Object.keys(characters['zhou-yuan'].sources!)).toHaveLength(1);
  });
});
