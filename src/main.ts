import './style.css';
import './visual.css';
import { loadContent } from './data/contentLoader';
import { SaveStore } from './data/saveStore';
import { StoryEngine, type StorySnapshot } from './engine/StoryEngine';
import { preloadImages, render, renderLoading, renderTitle, type RenderHooks } from './ui/render';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app not found');

const content = loadContent();
const engine = new StoryEngine(content);
const saveStore = new SaveStore(content.game.id);

const hooks: RenderHooks = {
  onAdvance: () => saveStore.save(engine.snapshot),
  onRestart: () => saveStore.clear(),
};

/** 目前場景要用到的圖（背景、立繪），在讀取畫面預載，進場時不會閃白。 */
function currentSceneImages(): Array<string | undefined> {
  const scene = engine.currentScene;
  const presentation = content.images.scenePresentation[scene.id];
  const backgroundId = presentation?.background ?? content.images.sceneBackgrounds[scene.id];
  const spriteId = presentation?.character;
  return [
    backgroundId ? content.images.backgrounds[backgroundId]?.src : undefined,
    spriteId ? content.images.characters[spriteId]?.src : undefined,
  ];
}

function enterGame(): void {
  // 讀取完成後停在讀取畫面，等玩家點擊才進入。
  renderLoading(app!, content, preloadImages(currentSceneImages()), () => render(app!, engine, content, hooks));
}

function startNewGame(): void {
  engine.restart();
  saveStore.clear();
  enterGame();
}

function resumeGame(snapshot: StorySnapshot): void {
  try {
    engine.restore(snapshot);
  } catch {
    // 存檔指向的場景已不存在（內容改版），丟棄後改開新局。
    saveStore.clear();
    startNewGame();
    return;
  }
  enterGame();
}

function showTitle(): void {
  const saved = saveStore.load();
  renderTitle(app!, content, {
    onStart: startNewGame,
    canResume: saved !== null,
    onResume: saved ? () => resumeGame(saved) : undefined,
  });
}

showTitle();
