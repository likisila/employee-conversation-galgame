import {
  parseCharacters,
  parseCutsceneCues,
  parseCutsceneSettings,
  parseGame,
  parseImages,
  parseManifest,
  parseMbaContent,
  parseScene,
  parseUi,
  type Character,
  type CutsceneCue,
  type CutsceneSettings,
  type Game,
  type ImageCatalog,
  type Manifest,
  type MbaContent,
  type Scene,
  type UiCopy,
} from '../domain/schema';
import { resolveAssetPath, resolveCatalogAssets } from './assetPath';

// sora-cutscenes.json 是產片用的 prompt 來源，執行端一行都不需要；若讓它進 glob，
// 18KB 的 prompt 與 style bible 會被打包進出貨的 JS。檔名改由 cutscene-cues.json 提供，
// 兩份是否一致由 tests/cutscenes.test.ts 把關。
const modules = import.meta.glob(['../../property/**/*.json', '!../../property/sora-cutscenes.json'], {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function normalize(path: string): string {
  return path.replace('../../property/', '');
}

const content = new Map(Object.entries(modules).map(([path, value]) => [normalize(path), value]));

function requireFile(path: string): unknown {
  const value = content.get(path);
  if (value === undefined) throw new Error(`property/${path} 找不到`);
  return value;
}

export interface LoadedContent {
  manifest: Manifest;
  game: Game;
  characters: Map<string, Character>;
  scenes: Map<string, Scene>;
  ui: UiCopy;
  images: ImageCatalog;
  cutscenes: CutsceneSettings;
  /** 以「進入哪個場景前播放」為索引的過場影片。 */
  cutsceneCues: Map<string, CutsceneCue>;
  /** 結局後可選的 MBA Organizational Debrief 內容。 */
  mba: MbaContent;
}

export function loadContent(): LoadedContent {
  const manifest = parseManifest(requireFile('manifest.json'));
  const game = parseGame(requireFile(manifest.game));
  const charactersArray = parseCharacters(requireFile(manifest.characters));
  const scenesArray = manifest.scenes.map((path) => parseScene(requireFile(path)));
  const ui = manifest.ui ? parseUi(requireFile(manifest.ui)) : parseUi({});
  const rawImages = manifest.images
    ? parseImages(requireFile(manifest.images))
    : parseImages({ characters: {}, backgrounds: {}, sceneBackgrounds: {}, screens: {}, ui: {}, transitions: {}, scenePresentation: {} });
  // 依部署 base 解析素材路徑，讓遊戲能部署在子路徑（如 GitHub Pages）。
  const images = resolveCatalogAssets(rawImages);

  const mba = manifest.mba ? parseMbaContent(requireFile(manifest.mba)) : parseMbaContent({});
  const cutscenes = manifest.cutscenes ? parseCutsceneSettings(requireFile(manifest.cutscenes)) : parseCutsceneSettings({});
  const cueList = manifest.cutsceneCues ? parseCutsceneCues(requireFile(manifest.cutsceneCues)) : [];
  const cutsceneCues = new Map(
    cueList.map((cue) => [cue.scene, {
      ...cue,
      src: resolveAssetPath(cue.src),
      storyboard: cue.storyboard?.map((frame) => ({ ...frame, src: resolveAssetPath(frame.src) })),
    }]),
  );

  const characters = new Map(charactersArray.map((item) => [item.id, item]));
  const scenes = new Map(scenesArray.map((item) => [item.id, item]));
  if (!scenes.has(game.startScene)) throw new Error(`startScene "${game.startScene}" 不存在`);
  // 影片掛在不存在的場景上永遠不會播，屬於資料錯誤，載入時就擋下來。
  for (const cue of cutsceneCues.values()) {
    if (!scenes.has(cue.scene)) throw new Error(`過場影片 ${cue.id} 掛在不存在的場景 ${cue.scene}`);
  }

  for (const scene of scenes.values()) {
    for (const line of scene.lines) {
      if (line.speaker && !characters.has(line.speaker)) throw new Error(`場景 ${scene.id} 引用了不存在的角色 ${line.speaker}`);
      // 台詞層級的換景／換人：晚一步才發現不存在會變成場景中途黑畫面，所以在載入時就擋下來。
      if (line.background && !images.backgrounds[line.background]) {
        throw new Error(`場景 ${scene.id} 的台詞背景 ${line.background} 不存在`);
      }
      if (typeof line.character === 'string') {
        if (!characters.has(line.character)) throw new Error(`場景 ${scene.id} 的台詞角色 ${line.character} 不存在`);
        if (!images.characters[line.character]) throw new Error(`場景 ${scene.id} 的台詞角色 ${line.character} 沒有視覺資產`);
      }
    }
    for (const choice of scene.choices) {
      if (!scenes.has(choice.next)) throw new Error(`場景 ${scene.id} 的 choice ${choice.id} 指向不存在的 ${choice.next}`);
    }
    if (scene.next && !scenes.has(scene.next)) throw new Error(`場景 ${scene.id} 指向不存在的 ${scene.next}`);
    for (const entry of scene.route ?? []) {
      if (!scenes.has(entry.next)) throw new Error(`場景 ${scene.id} 的 route 指向不存在的 ${entry.next}`);
    }
  }

  for (const [sceneId, presentation] of Object.entries(images.scenePresentation)) {
    // 視覺設定可能為尚未接進 manifest 的草稿場景而存在；此時略過即可，
    // 不應讓整個遊戲載入失敗（否則會變成黑畫面）。
    if (!scenes.has(sceneId)) {
      console.warn(`images.scenePresentation 參照未載入的場景「${sceneId}」，已略過其視覺設定。`);
      continue;
    }
    if (presentation.background && !images.backgrounds[presentation.background]) throw new Error(`場景 ${sceneId} 的背景 ${presentation.background} 不存在`);
    if (presentation.transition && !images.transitions[presentation.transition]) throw new Error(`場景 ${sceneId} 的轉場 ${presentation.transition} 不存在`);
    if (presentation.character) {
      if (!characters.has(presentation.character)) throw new Error(`場景 ${sceneId} 的角色 ${presentation.character} 不存在`);
      const sprite = images.characters[presentation.character];
      if (!sprite) throw new Error(`場景 ${sceneId} 的角色 ${presentation.character} 沒有視覺資產`);
      if (presentation.expression && sprite.expressions[presentation.expression] === undefined) {
        throw new Error(`場景 ${sceneId} 的表情 ${presentation.expression} 不存在於角色 ${presentation.character}`);
      }
    }
  }

  for (const [transitionId, transition] of Object.entries(images.transitions)) {
    if (transition.asset && !images.ui[transition.asset]) throw new Error(`轉場 ${transitionId} 引用了不存在的 UI asset ${transition.asset}`);
  }

  return { manifest, game, characters, scenes, ui, images, cutscenes, cutsceneCues, mba };
}
