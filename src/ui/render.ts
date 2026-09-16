import type { LoadedContent } from '../data/contentLoader';
import type { StoryEngine } from '../engine/StoryEngine';

/** 標題畫面的行為掛勾。有存檔時提供 onResume，讓玩家選擇繼續。 */
export interface TitleHooks {
  onStart: () => void;
  onResume?: () => void;
  canResume?: boolean;
}

/** 遊戲畫面的行為掛勾，讓外層在玩家動作後執行副作用（例如自動存檔）。 */
export interface RenderHooks {
  onAdvance?: () => void;
  onRestart?: () => void;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function imageStyle(src?: string, focalPoint = '50% 50%'): string {
  return src ? `background-image:url('${escapeHtml(src)}');background-position:${escapeHtml(focalPoint)}` : '';
}

function cssUrl(src?: string): string {
  return src ? `url('${escapeHtml(src)}')` : 'none';
}

export function renderTitle(app: HTMLElement, content: LoadedContent, hooks: TitleHooks): void {
  const title = content.images.screens.title;
  const canResume = hooks.canResume === true && typeof hooks.onResume === 'function';
  const startLabel = canResume ? content.ui.newGameLabel : content.ui.startLabel;
  const actions = canResume
    ? `<button class="primary-action" id="resume">${escapeHtml(content.ui.resumeLabel)}</button>
       <button class="secondary-action" id="start">${escapeHtml(startLabel)}</button>`
    : `<button class="primary-action" id="start">${escapeHtml(startLabel)}</button>`;
  app.innerHTML = `
    <section class="title-screen" style="${imageStyle(title?.src, title?.focalPoint)}">
      <div class="title-shade" aria-hidden="true"></div>
      <div class="title-copy">
        <p class="eyebrow">A WORKPLACE CONVERSATION</p>
        <h1>${escapeHtml(content.game.title)}</h1>
        <p class="subtitle">${escapeHtml(content.ui.subtitle)}</p>
        <div class="title-actions">${actions}</div>
      </div>
    </section>
  `;
  app.querySelector<HTMLButtonElement>('#start')?.addEventListener('click', hooks.onStart);
  if (canResume) {
    app.querySelector<HTMLButtonElement>('#resume')?.addEventListener('click', hooks.onResume!);
  }
}

export function renderLoading(app: HTMLElement, content: LoadedContent): void {
  const loading = content.images.screens.loading;
  app.innerHTML = `
    <section class="loading-screen" style="${imageStyle(loading?.src, loading?.focalPoint)}" aria-busy="true">
      <div class="loading-copy">
        <p class="eyebrow">BEFORE WE TALK</p>
        <h1>${escapeHtml(content.ui.loadingLabel)}</h1>
        <p>有些話，需要先留一點空白。</p>
        <div class="loading-bar" role="progressbar" aria-label="${escapeHtml(content.ui.loadingLabel)}"><span></span></div>
      </div>
    </section>
  `;
}

export function render(app: HTMLElement, engine: StoryEngine, content: LoadedContent, hooks: RenderHooks = {}): void {
  const scene = engine.currentScene;
  const visibleLines = engine.visibleLines;
  const presentation = content.images.scenePresentation[scene.id];
  const activeLine = [...visibleLines].reverse().find((line) => line.speaker && content.characters.has(line.speaker));
  const fallbackCharacterId = activeLine?.speaker ?? undefined;
  const characterId = presentation?.character ?? fallbackCharacterId;
  const activeCharacter = characterId ? content.characters.get(characterId) : undefined;
  const sprite = activeCharacter ? content.images.characters[activeCharacter.id] : undefined;
  const expression = presentation?.expression ?? sprite?.defaultExpression;
  const frame = sprite && expression ? sprite.expressions[expression] ?? sprite.expressions[sprite.defaultExpression] ?? 0 : 0;
  const position = sprite && sprite.columns > 1 ? (frame / (sprite.columns - 1)) * 100 : 0;

  const backgroundId = presentation?.background ?? content.images.sceneBackgrounds[scene.id];
  const background = backgroundId ? content.images.backgrounds[backgroundId] : undefined;
  const transitionId = presentation?.transition ?? 'none';
  const transition = content.images.transitions[transitionId];
  const transitionAsset = transition?.asset ? content.images.ui[transition.asset] : undefined;
  const dialoguePanel = content.images.ui.dialoguePanel;
  const choiceFrame = content.images.ui.choiceFrame;

  const lines = visibleLines.map((line) => {
    const speaker = line.speaker ? content.characters.get(line.speaker)?.displayName ?? line.speaker : content.ui.narratorName;
    return `<article class="line"><strong>${escapeHtml(speaker)}</strong><p>${escapeHtml(line.text)}</p></article>`;
  }).join('');
  const choices = engine.availableChoices.map((choice, index) =>
    `<button class="choice" data-choice="${escapeHtml(choice.id)}" style="--choice-frame:${cssUrl(choiceFrame)}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(choice.text)}</button>`,
  ).join('');
  const action = scene.ending
    ? `<button class="primary-action full" id="restart">${escapeHtml(content.ui.restartLabel)}</button>`
    : choices
      ? `<section class="choices"><h2>${escapeHtml(content.ui.choicePrompt)}</h2>${choices}</section>`
      : scene.next
        ? `<button class="primary-action full" id="continue">${escapeHtml(content.ui.continueLabel)}</button>`
        : '';

  app.innerHTML = `
    <section class="game-screen" data-transition="${escapeHtml(transitionId)}" style="${imageStyle(background?.src, background?.focalPoint)};--transition-duration:${transition?.durationMs ?? 0}ms;--dialogue-panel:${cssUrl(dialoguePanel)}">
      <div class="scene-transition" aria-hidden="true" style="--transition-art:${cssUrl(transitionAsset)}"></div>
      <div class="scene-scrim" aria-hidden="true"></div>
      <header class="game-header"><p class="eyebrow">${escapeHtml(content.game.title)}</p><h1>${escapeHtml(scene.title ?? '')}</h1></header>
      ${sprite ? `<div class="character-stage" role="img" aria-label="${escapeHtml(sprite.alt)}" data-expression="${escapeHtml(expression ?? '')}" data-align="${escapeHtml(sprite.align ?? 'center')}"><div class="character-sprite" style="--sprite:url('${escapeHtml(sprite.src)}');--columns:${sprite.columns};--position:${position}%${sprite.frameAspectRatio ? `;--frame-aspect:${sprite.frameAspectRatio}` : ''}"></div></div>` : ''}
      <div class="story-panel"><section class="dialogue" aria-live="polite">${lines}</section><footer>${action}</footer></div>
    </section>
  `;

  app.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      engine.choose(button.dataset.choice!);
      render(app, engine, content, hooks);
      hooks.onAdvance?.();
    });
  });
  app.querySelector<HTMLButtonElement>('#continue')?.addEventListener('click', () => {
    engine.continue();
    render(app, engine, content, hooks);
    hooks.onAdvance?.();
  });
  app.querySelector<HTMLButtonElement>('#restart')?.addEventListener('click', () => {
    engine.restart();
    render(app, engine, content, hooks);
    hooks.onRestart?.();
  });
}
