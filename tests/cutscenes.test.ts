import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';
import { parseCutsceneCues, parseCutsceneSettings } from '../src/domain/schema';
import { MUTE_KEY, readMuted } from '../src/ui/cutscene';

interface SoraItem { id: string; file: string; trigger: string; status: string }

function soraItems(): SoraItem[] {
  // 刻意直接讀檔：sora-cutscenes.json 已排除在執行端的 glob 之外（避免把 18KB 的
  // prompt 打包進出貨的 JS），所以這份單一內容來源只在測試裡被讀到。
  return JSON.parse(readFileSync(new URL('../property/sora-cutscenes.json', import.meta.url), 'utf8')).items;
}

describe('過場影片的資料契約', () => {
  const content = loadContent();
  const cues = [...content.cutsceneCues.values()];

  it('每段 cue 都對得上 sora manifest 的 id、檔名與 trigger', () => {
    const items = new Map(soraItems().map((item) => [item.id, item]));
    expect(cues.length).toBeGreaterThan(0);
    for (const cue of cues) {
      const item = items.get(cue.id);
      // cue 檔是 Claude 維護的技術對應，內容來源仍是 ChatGPT 維護的 sora manifest；
      // 這條斷言就是兩者之間的防漂移鎖。
      expect(item, `sora manifest 沒有 ${cue.id}`).toBeDefined();
      expect(cue.file).toBe(item!.file);
      expect(cue.trigger).toBe(item!.trigger);
    }
  });

  it('sora manifest 裡每段 READY 的影片都有掛載點', () => {
    const mapped = new Set(cues.map((cue) => cue.id));
    for (const item of soraItems()) {
      if (item.status !== 'READY') continue;
      expect(mapped.has(item.id), `${item.id} 沒有對應的引擎場景`).toBe(true);
    }
  });

  it('每段 cue 都掛在真實存在的場景上，且一個場景只掛一段', () => {
    const scenes = new Set(content.scenes.keys());
    const seen = new Set<string>();
    for (const cue of cues) {
      expect(scenes.has(cue.scene), `${cue.scene} 不是引擎場景`).toBe(true);
      expect(seen.has(cue.scene), `${cue.scene} 掛了不只一段影片`).toBe(false);
      seen.add(cue.scene);
    }
  });

  it('影片路徑指向 cutscenes 目錄下的 mp4', () => {
    for (const cue of cues) {
      expect(cue.src).toMatch(/\/assets\/cutscenes\/[\w-]+\.mp4$/);
    }
  });

  it('四個結局各自掛一段互斥的影片', () => {
    // 影片掛在 s9-doorway 路由後直接落腳的場景，不是每個 `ending: true` 的場景——
    // TRUE END 路由到的仍是 ending-true（微選擇四的起點），真正的 `ending: true`
    // 在感情線微選擇匯流之後的 ending-true-finale，那裡沒有另外掛影片。
    const doorway = content.scenes.get('s9-doorway')!;
    const endingSceneIds = [...new Set((doorway.route ?? []).map((entry) => entry.next))];
    expect(endingSceneIds).toHaveLength(4);
    const files = endingSceneIds.map((id) => content.cutsceneCues.get(id)?.file);
    expect(files.every((file) => typeof file === 'string')).toBe(true);
    expect(new Set(files).size).toBe(4);
  });

  it('走完任一條路，共通主線的每段影片最多只會遇到一次', () => {
    const engine = new StoryEngine(content);
    const encountered: string[] = [];
    for (let guard = 0; guard < 500; guard += 1) {
      const cue = content.cutsceneCues.get(engine.currentScene.id);
      if (cue && !engine.hasWatchedCutscene(cue.id)) {
        encountered.push(cue.id);
        engine.markCutsceneWatched(cue.id);
      }
      const choices = engine.availableChoices;
      if (engine.atLastLine && choices.length > 0) {
        engine.choose(choices[0]!.id);
        continue;
      }
      if (!engine.advance()) break;
    }
    expect(new Set(encountered).size).toBe(encountered.length);
    // 一條路會經過共通主線的五段，加上抵達的那一個結局。
    expect(encountered).toContain('layoff-notification');
    expect(encountered.filter((id) => id.startsWith('ending-'))).toHaveLength(1);
  });
});

describe('parseCutsceneCues', () => {
  const cue = { id: 'a', file: 'a.mp4', trigger: 'before:a', scene: 's1' };

  it('以 directory 組出影片路徑', () => {
    const [parsed] = parseCutsceneCues({ directory: '/assets/cutscenes', cues: [cue] });
    expect(parsed!.src).toBe('/assets/cutscenes/a.mp4');
  });

  it('directory 結尾多一個斜線也不會變成雙斜線', () => {
    const [parsed] = parseCutsceneCues({ directory: '/assets/cutscenes/', cues: [cue] });
    expect(parsed!.src).toBe('/assets/cutscenes/a.mp4');
  });

  it('擋下重複的 id 與同場景掛多段', () => {
    expect(() => parseCutsceneCues({ cues: [cue, cue] })).toThrow(/重複的 id/);
    expect(() => parseCutsceneCues({ cues: [cue, { ...cue, id: 'b', scene: 's1' }] })).toThrow(/掛了多段影片/);
  });

  it('cues 不是陣列或缺欄位時丟出錯誤', () => {
    expect(() => parseCutsceneCues({})).toThrow(/必須是陣列/);
    expect(() => parseCutsceneCues({ cues: [{ id: 'a' }] })).toThrow();
  });
});

describe('parseCutsceneSettings', () => {
  it('接受已知的缺檔策略', () => {
    expect(parseCutsceneSettings({ missingAssetBehavior: 'skip-video-and-enter-canonical-scene' }).missingAssetBehavior)
      .toBe('skip-video-and-enter-canonical-scene');
  });

  it('沒寫時用預設策略', () => {
    expect(parseCutsceneSettings({}).missingAssetBehavior).toBe('skip-video-and-enter-canonical-scene');
  });

  it('遇到未知策略時丟出錯誤，而不是默默用預設值', () => {
    expect(() => parseCutsceneSettings({ missingAssetBehavior: 'play-legacy-fallback' })).toThrow(/不支援/);
  });
});

describe('已看過的過場影片', () => {
  it('會進存檔快照，讀檔後不重播，重新開始則清空', () => {
    const engine = new StoryEngine(loadContent());
    engine.markCutsceneWatched('layoff-notification');
    expect(engine.hasWatchedCutscene('layoff-notification')).toBe(true);

    const snapshot = engine.snapshot;
    expect(snapshot.watchedCutscenes).toContain('layoff-notification');

    const restored = new StoryEngine(loadContent());
    restored.restore(snapshot);
    expect(restored.hasWatchedCutscene('layoff-notification')).toBe(true);

    restored.restart();
    expect(restored.hasWatchedCutscene('layoff-notification')).toBe(false);
  });

  it('舊存檔沒有這個欄位時，視為全都沒看過', () => {
    const engine = new StoryEngine(loadContent());
    engine.restore({ sceneId: 's4-notice', state: {} });
    expect(engine.hasWatchedCutscene('layoff-notification')).toBe(false);
  });
});

describe('過場影片的靜音預設', () => {
  const storage = (value: string | null) => ({ getItem: (key: string) => (key === MUTE_KEY ? value : null) });

  it('沒有偏好時預設靜音', () => {
    expect(readMuted(storage(null))).toBe(true);
  });

  it('只有玩家自己開過聲音才有聲', () => {
    expect(readMuted(storage('false'))).toBe(false);
    expect(readMuted(storage('true'))).toBe(true);
  });

  it('讀不到瀏覽器儲存時仍然靜音', () => {
    expect(readMuted(undefined)).toBe(true);
    expect(readMuted({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
  });
});

describe('分鏡 placeholder', () => {
  const root = path.resolve(__dirname, '..');
  const content = loadContent();
  const storyboards = [...content.cutsceneCues.values()].filter((cue) => cue.storyboard);

  it('共通主線目前有分鏡可以頂替缺檔影片的段落（rights-packet 因分鏡圖有缺陷仍拿掉；final-documents／meeting-invitation／layoff-notification 的正式影片因人物是改版前的舊設定已下架，改用分鏡頂替，見 docs/ai-handoff/CLAUDE.md Claude-20260925-2240）', () => {
    expect(storyboards.map((cue) => cue.id)).toEqual(
      ['final-documents', 'meeting-invitation', 'layoff-notification', 'boundary-question'],
    );
  });

  it('每一格都指向已產生的交付檔，且鏡號屬於該段（00-A 只能在 00 段）', () => {
    for (const cue of storyboards) {
      const segment = cue.file.slice(0, 2);
      for (const frame of cue.storyboard!) {
        expect(frame.shot.startsWith(`${segment}-`), `${cue.id} 用了別段的鏡頭 ${frame.shot}`).toBe(true);
        expect(frame.src).toBe(`/assets/cutscenes/storyboard/${frame.shot}.webp`);
        expect(existsSync(path.join(root, 'public', frame.src.slice(1))), `缺少 ${frame.src}，請執行 npm run assets:storyboard`)
          .toBe(true);
      }
    }
  });

  it('交付檔與分鏡原圖同步：原圖換過就必須重新產生', () => {
    const manifest = JSON.parse(readFileSync(path.join(root, 'public/assets/cutscenes/storyboard/manifest.json'), 'utf8')) as {
      files: Record<string, { source: string; sourceSha256: string; bytes: number }>;
    };
    const entries = Object.entries(manifest.files);
    expect(entries.length).toBeGreaterThan(0);
    for (const [output, record] of entries) {
      const source = readFileSync(path.join(root, 'public/assets/cutscenes/keyframes/runway-v2', record.source));
      expect(createHash('sha256').update(source).digest('hex'), `${record.source} 換過了，請執行 npm run assets:storyboard`)
        .toBe(record.sourceSha256);
      expect(statSync(path.join(root, 'public/assets/cutscenes/storyboard', output)).size).toBe(record.bytes);
    }
  });

  it('解析分鏡：組出交付圖路徑，並擋下空陣列與不合理的秒數', () => {
    const cue = { id: 'a', file: 'a.mp4', trigger: 'before:a', scene: 's1' };
    const [parsed] = parseCutsceneCues({ directory: '/assets/cutscenes', cues: [{ ...cue, storyboard: [{ shot: '00-A', seconds: 2 }] }] });
    expect(parsed!.storyboard).toEqual([{ shot: '00-A', seconds: 2, src: '/assets/cutscenes/storyboard/00-A.webp' }]);
    expect(parseCutsceneCues({ cues: [cue] })[0]!.storyboard).toBeUndefined();
    expect(() => parseCutsceneCues({ cues: [{ ...cue, storyboard: [] }] })).toThrow(/非空陣列/);
    expect(() => parseCutsceneCues({ cues: [{ ...cue, storyboard: [{ shot: '00-A', seconds: 0 }] }] })).toThrow(/seconds/);
    expect(() => parseCutsceneCues({ cues: [{ ...cue, storyboard: [{ shot: '00-A' }] }] })).toThrow(/seconds/);
  });
});
