import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';
import { parseCutsceneCues, parseCutsceneSettings } from '../src/domain/schema';

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
    const endings = [...content.scenes.values()].filter((scene) => scene.ending);
    expect(endings).toHaveLength(4);
    const files = endings.map((scene) => content.cutsceneCues.get(scene.id)?.file);
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
