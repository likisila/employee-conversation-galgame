import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { spriteDeliverySrc } from '../src/data/assetPath';
import { parseImages } from '../src/domain/schema';
import images from '../property/images.json';

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'public/assets/characters/web/manifest.json');

interface Manifest {
  files: Record<string, { source: string; sourceSha256: string; bytes: number; sourceBytes: number }>;
}

describe('立繪交付檔（WebP）', () => {
  it('只換掉原始全身 PNG 的副檔名與目錄，其他路徑原樣保留', () => {
    expect(spriteDeliverySrc('/assets/characters/full-body/a-neutral.png')).toBe('/assets/characters/web/a-neutral.webp');
    expect(spriteDeliverySrc('/assets/characters/sheet.png')).toBe('/assets/characters/sheet.png');
    expect(spriteDeliverySrc('/assets/backgrounds/room.webp')).toBe('/assets/backgrounds/room.webp');
    expect(spriteDeliverySrc('https://cdn/x.png')).toBe('https://cdn/x.png');
  });

  it('正式內容引用的每張立繪都有對應的交付檔', () => {
    const { characters } = parseImages(images as Parameters<typeof parseImages>[0]);
    const referenced = Object.values(characters).flatMap((sheet) => [sheet.src, ...Object.values(sheet.sources ?? {})]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const src of new Set(referenced)) {
      const delivery = spriteDeliverySrc(src);
      expect(delivery, `${src} 應改由交付檔提供`).not.toBe(src);
      expect(existsSync(path.join(root, 'public', delivery.slice(1))), `缺少交付檔 ${delivery}，請執行 npm run assets:sprites`).toBe(true);
    }
  });

  it('交付檔與原始素材同步：來源 PNG 換過就必須重新產生', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
    const entries = Object.entries(manifest.files);
    expect(entries.length).toBeGreaterThan(0);
    for (const [output, record] of entries) {
      const source = readFileSync(path.join(root, 'public/assets/characters/full-body', record.source));
      expect(createHash('sha256').update(source).digest('hex'), `${record.source} 換過了，請執行 npm run assets:sprites`)
        .toBe(record.sourceSha256);
      expect(statSync(path.join(root, 'public/assets/characters/web', output)).size).toBe(record.bytes);
    }
  });

  it('交付檔遠小於原始 PNG（讀取速度就是靠這個）', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
    const files = Object.values(manifest.files);
    const before = files.reduce((sum, file) => sum + file.sourceBytes, 0);
    const after = files.reduce((sum, file) => sum + file.bytes, 0);
    expect(after).toBeLessThan(before * 0.2);
  });
});
