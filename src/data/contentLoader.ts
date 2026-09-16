import {
  parseCharacters,
  parseGame,
  parseImages,
  parseManifest,
  parseScene,
  parseUi,
  type Character,
  type Game,
  type ImageCatalog,
  type Manifest,
  type Scene,
  type UiCopy,
} from '../domain/schema';
import { resolveCatalogAssets } from './assetPath';

const modules = import.meta.glob('../../property/**/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

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

  const characters = new Map(charactersArray.map((item) => [item.id, item]));
  const scenes = new Map(scenesArray.map((item) => [item.id, item]));
  if (!scenes.has(game.startScene)) throw new Error(`startScene "${game.startScene}" 不存在`);

  for (const scene of scenes.values()) {
    for (const line of scene.lines) {
      if (line.speaker && !characters.has(line.speaker)) throw new Error(`場景 ${scene.id} 引用了不存在的角色 ${line.speaker}`);
    }
    for (const choice of scene.choices) {
      if (!scenes.has(choice.next)) throw new Error(`場景 ${scene.id} 的 choice ${choice.id} 指向不存在的 ${choice.next}`);
    }
    if (scene.next && !scenes.has(scene.next)) throw new Error(`場景 ${scene.id} 指向不存在的 ${scene.next}`);
  }

  for (const [sceneId, presentation] of Object.entries(images.scenePresentation)) {
    if (!scenes.has(sceneId)) throw new Error(`images.scenePresentation 指向不存在的場景 ${sceneId}`);
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

  return { manifest, game, characters, scenes, ui, images };
}
