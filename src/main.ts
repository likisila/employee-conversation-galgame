import './style.css';
import './visual.css';
import { loadContent } from './data/contentLoader';
import { SaveStore } from './data/saveStore';
import { StoryEngine, type StorySnapshot } from './engine/StoryEngine';
import { render, renderLoading, renderTitle, type RenderHooks } from './ui/render';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app not found');

const content = loadContent();
const engine = new StoryEngine(content);
const saveStore = new SaveStore(content.game.id);

const hooks: RenderHooks = {
  onAdvance: () => saveStore.save(engine.snapshot),
  onRestart: () => saveStore.clear(),
};

function enterGame(): void {
  renderLoading(app!, content);
  window.setTimeout(() => render(app!, engine, content, hooks), 700);
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
