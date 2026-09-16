import type { LoadedContent } from '../data/contentLoader';
import type { StoryEngine } from '../engine/StoryEngine';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function render(app: HTMLElement, engine: StoryEngine, content: LoadedContent): void {
  const scene = engine.currentScene;
  const lines = scene.lines.map((line) => {
    const speaker = line.speaker
      ? content.characters.get(line.speaker)?.displayName ?? line.speaker
      : content.ui.narratorName;
    return `<article class="line"><strong>${escapeHtml(speaker)}</strong><p>${escapeHtml(line.text)}</p></article>`;
  }).join('');

  const choices = engine.availableChoices.map((choice) =>
    `<button class="choice" data-choice="${escapeHtml(choice.id)}">${escapeHtml(choice.text)}</button>`,
  ).join('');

  const action = scene.ending
    ? `<button id="restart">${escapeHtml(content.ui.restartLabel)}</button>`
    : choices
      ? `<section class="choices"><h2>${escapeHtml(content.ui.choicePrompt)}</h2>${choices}</section>`
      : scene.next
        ? `<button id="continue">${escapeHtml(content.ui.continueLabel)}</button>`
        : '';

  app.innerHTML = `
    <div class="shell">
      <header><p class="eyebrow">${escapeHtml(content.game.title)}</p><h1>${escapeHtml(scene.title ?? '')}</h1></header>
      <section class="dialogue">${lines}</section>
      <footer>${action}</footer>
    </div>
  `;

  app.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      engine.choose(button.dataset.choice!);
      render(app, engine, content);
    });
  });

  app.querySelector<HTMLButtonElement>('#continue')?.addEventListener('click', () => {
    engine.continue();
    render(app, engine, content);
  });

  app.querySelector<HTMLButtonElement>('#restart')?.addEventListener('click', () => {
    engine.restart();
    render(app, engine, content);
  });
}
