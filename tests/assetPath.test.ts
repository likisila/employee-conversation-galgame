import { describe, expect, it } from 'vitest';
import { resolveAssetPath, resolveCatalogAssets } from '../src/data/assetPath';
import type { ImageCatalog } from '../src/domain/schema';

describe('resolveAssetPath', () => {
  it('leaves root-absolute paths unchanged under base "/"', () => {
    expect(resolveAssetPath('/assets/x.webp', '/')).toBe('/assets/x.webp');
  });

  it('prefixes a subpath base', () => {
    expect(resolveAssetPath('/assets/x.webp', '/repo/')).toBe('/repo/assets/x.webp');
  });

  it('normalizes a base without a trailing slash', () => {
    expect(resolveAssetPath('/assets/x.webp', '/repo')).toBe('/repo/assets/x.webp');
  });

  it('leaves relative and external URLs untouched', () => {
    expect(resolveAssetPath('assets/x.webp', '/repo/')).toBe('assets/x.webp');
    expect(resolveAssetPath('https://cdn/x.webp', '/repo/')).toBe('https://cdn/x.webp');
    expect(resolveAssetPath('data:image/png;base64,AAAA', '/repo/')).toBe('data:image/png;base64,AAAA');
  });
});

describe('resolveCatalogAssets', () => {
  it('resolves src fields but preserves ids, keys and non-path values', () => {
    const catalog: ImageCatalog = {
      characters: {
        emp: { src: '/assets/characters/emp.png', alt: 'emp', columns: 3, defaultExpression: 'calm', expressions: { calm: 0, worried: 1 } },
      },
      backgrounds: { room: { src: '/assets/backgrounds/room.webp', alt: 'room' } },
      screens: { title: { src: '/assets/screens/title.webp', alt: 'title' } },
      ui: { panel: '/assets/ui/panel.svg' },
      sceneBackgrounds: { intro: 'room' },
      transitions: { wipe: { durationMs: 300, asset: 'panel' } },
      scenePresentation: { intro: { background: 'room', character: 'emp', expression: 'calm' } },
    };

    const resolved = resolveCatalogAssets(catalog, '/repo/');

    expect(resolved.characters.emp.src).toBe('/repo/assets/characters/emp.png');
    expect(resolved.characters.emp.expressions).toEqual({ calm: 0, worried: 1 });
    expect(resolved.backgrounds.room.src).toBe('/repo/assets/backgrounds/room.webp');
    expect(resolved.screens.title.src).toBe('/repo/assets/screens/title.webp');
    expect(resolved.ui.panel).toBe('/repo/assets/ui/panel.svg');
    // 非路徑值不變
    expect(resolved.sceneBackgrounds.intro).toBe('room');
    expect(resolved.transitions.wipe.asset).toBe('panel');
    expect(resolved.scenePresentation.intro).toEqual({ background: 'room', character: 'emp', expression: 'calm' });
    // 不改動原輸入
    expect(catalog.characters.emp.src).toBe('/assets/characters/emp.png');
  });
});
