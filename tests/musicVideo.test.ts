import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { parseMusicVideo } from '../src/domain/schema';

describe('通關後的完整 MV 入口（docs/media/cutscene-mv-integration-20261117.md v2）', () => {
  const content = loadContent();

  it('入口只放在四個真正的通關頁；ending-true 還有後日談，不放', () => {
    expect([...content.musicVideo.endingScenes].sort()).toEqual(
      ['ending-decent', 'ending-over-line', 'ending-soft-knife', 'ending-true-finale'],
    );
    expect(content.musicVideo.endingScenes).not.toContain('ending-true');
    for (const id of content.musicVideo.endingScenes) expect(content.scenes.get(id)?.ending, id).toBe(true);
  });

  it('s9 路由到的每個結局最終都會落在一個有入口的通關頁', () => {
    const doorway = content.scenes.get('s9-doorway')!;
    const landed = new Set((doorway.route ?? []).map((entry) => entry.next));
    for (const id of landed) {
      if (id === 'ending-true') continue; // TRUE END 經感情線微選擇匯流到 ending-true-finale
      expect(content.musicVideo.endingScenes).toContain(id);
    }
  });

  it('已掛上使用者確認的成片（Higgsfield 上傳 fbcf2384，3:48，網頁版轉檔）', () => {
    expect(content.musicVideo.src).toMatch(/\/assets\/music-video\/mv_kitei_no_ashita\.mp4$/);
  });

  it('使用者確認 MV 不含其他結局畫面：不顯示劇透提示，按下入口直接播放', () => {
    expect(content.musicVideo.spoilerNotice).toBe(false);
  });

  it('成片低於部署平台的單檔 25 MiB 上限', () => {
    const root = path.resolve(__dirname, '..');
    const file = path.join(root, 'public', content.musicVideo.src!.replace(/^\/+/, '').replace(/^.*?assets\//, 'assets/'));
    expect(statSync(file).size).toBeLessThan(25 * 1024 * 1024);
  });

  it('掛上的檔案必須真的存在於 public/', () => {
    if (!content.musicVideo.src) return;
    const root = path.resolve(__dirname, '..');
    expect(existsSync(path.join(root, 'public', content.musicVideo.src.replace(/^\/+/, '').replace(/^.*?assets\//, 'assets/')))).toBe(true);
  });
});

describe('parseMusicVideo', () => {
  const base = { endingScenes: ['ending-a'] };

  it('file 為 null 時沒有路徑；有檔名時以 directory 組出路徑', () => {
    expect(parseMusicVideo({ ...base, file: null }).src).toBeUndefined();
    expect(parseMusicVideo({ ...base, directory: '/assets/music-video/', file: 'mv.mp4' }).src).toBe('/assets/music-video/mv.mp4');
  });

  it('劇透提示預設開啟，只有明確寫 false 才關', () => {
    expect(parseMusicVideo(base).spoilerNotice).toBe(true);
    expect(parseMusicVideo({ ...base, spoilerNotice: false }).spoilerNotice).toBe(false);
  });

  it('擋下格式錯誤', () => {
    expect(() => parseMusicVideo(null)).toThrow(/物件/);
    expect(() => parseMusicVideo({ endingScenes: 'ending-a' })).toThrow(/endingScenes/);
    expect(() => parseMusicVideo({ ...base, file: '../mv.mp4' })).toThrow(/mp4/);
    expect(() => parseMusicVideo({ ...base, file: 'mv.mov' })).toThrow(/mp4/);
  });
});
