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
  const images = manifest.images
    ? parseImages(requireFile(manifest.images))
    : parseImages({ characters: {}, backgrounds: {}, sceneBackgrounds: {}, screens: {}, ui: {} });

  const characters = new Map(charactersArray.map((item) => [item.id, item]));
  const scenes = new Map(scenesArray.map((item) => [item.id, item]));
  if (!scenes.has(game.startScene)) throw new Error(`startScene "${game.startScene}" 不存在`);
  for (const scene of scenes.values()) {
    for (const choice of scene.choices) {
      if (!scenes.has(choice.next)) throw new Error(`場景 ${scene.id} 的 choice ${choice.id} 指向不存在的 ${choice.next}`);
    }
    if (scene.next && !scenes.has(scene.next)) throw new Error(`場景 ${scene.id} 指向不存在的 ${scene.next}`);
  }
  return { manifest, game, characters, scenes, ui, images };
}
