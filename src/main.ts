import './style.css';
import './visual.css';
import { loadContent } from './data/contentLoader';
import { SaveStore } from './data/saveStore';
import { StoryEngine, type StorySnapshot } from './engine/StoryEngine';
import { spriteSource } from './ui/presentation';
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
  // 場景中途可能換景（台詞的 background），這些背景也要一起預載。
  const backgroundIds = new Set<string>(
    [presentation?.background ?? content.images.sceneBackgrounds[scene.id], ...scene.lines.map((line) => line.background)].filter(
      (id): id is string => typeof id === 'string',
    ),
  );
  // 立繪跟著說話者走，所以這一場會出現的每位說話者與被指定的角色立繪都先載。
  const spriteIds = new Set<string>([
    ...(presentation?.character ? [presentation.character] : []),
    ...scene.lines.flatMap((line) => (line.speaker ? [line.speaker] : [])),
    ...scene.lines.flatMap((line) => (typeof line.character === 'string' ? [line.character] : [])),
  ]);
  return [
    ...[...backgroundIds].map((id) => content.images.backgrounds[id]?.src),
    // 逐張素材時一個表情就是一張圖，不能只載「角色的第一張」：場景指定表情的那位角色載指定的那張，
    // 其他人載各自的預設表情。sprite sheet 兩種情況都回同一張整圖，行為不變。
    ...[...spriteIds].flatMap((id) => {
      const sheet = content.images.characters[id];
      if (!sheet) return [];
      const expression = id === presentation?.character ? presentation?.expression : undefined;
      return [spriteSource(sheet, expression)];
    }),
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
