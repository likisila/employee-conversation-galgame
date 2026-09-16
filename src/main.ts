import './style.css';
import { loadContent } from './data/contentLoader';
import { StoryEngine } from './engine/StoryEngine';
import { render } from './ui/render';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app not found');

const content = loadContent();
const engine = new StoryEngine(content);
render(app, engine, content);
