import { describe, expect, it } from 'vitest';
import { SOURCE_ONLY_PUBLIC_DIRS } from '../vite.config';
import { loadContent } from '../src/data/contentLoader';
import { resolveCatalogAssets } from '../src/data/assetPath';

describe('出貨時排除的素材來源目錄', () => {
  it('執行時會下載的素材都不在排除的目錄裡', () => {
    const content = loadContent();
    const catalog = resolveCatalogAssets(content.images, '/');
    const runtime = [
      ...Object.values(catalog.characters).flatMap((sheet) => [sheet.src, ...Object.values(sheet.sources ?? {})]),
      ...Object.values(catalog.backgrounds).map((bg) => bg.src),
      ...Object.values(catalog.screens).map((screen) => screen.src),
      ...Object.values(catalog.ui),
      ...[...content.cutsceneCues.values()].flatMap((cue) => [cue.src, ...(cue.storyboard ?? []).map((frame) => frame.src)]),
    ];
    expect(runtime.length).toBeGreaterThan(0);
    for (const src of runtime) {
      for (const dir of SOURCE_ONLY_PUBLIC_DIRS) {
        expect(src.startsWith(`/${dir}/`), `${src} 會被執行時下載，卻被排除在出貨之外`).toBe(false);
      }
    }
  });
});
