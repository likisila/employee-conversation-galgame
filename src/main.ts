import './style.css';
import { loadContent } from './data/contentLoader';
import { StoryEngine } from './engine/StoryEngine';
import { render, renderLoading, renderTitle } from './ui/render';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app not found');

const content = loadContent();
const engine = new StoryEngine(content);
renderTitle(app, content, () => {
  renderLoading(app, content);
  window.setTimeout(() => render(app, engine, content), 700);
});
