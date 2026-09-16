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

let keyHandler: ((event: KeyboardEvent) => void) | undefined;
/** 上一次 render 的場景；同場景內逐句前進時不重播轉場與立繪淡入。 */
let lastSceneId: string | undefined;
/** 量測對話框高度、把立繪底線寫成 CSS 變數；換場景時先解除上一次的觀察。 */
let panelObserver: ResizeObserver | undefined;
let resizeHandler: (() => void) | undefined;

/**
 * 立繪永遠站在對話框上緣：不論面板因選項或換行而變高、或視窗變矮，
 * 都把 `--stage-bottom` 設成「視窗底到面板上緣」的距離，讓 CSS 據此排版。
 */
function keepStageAbovePanel(screen: HTMLElement, panel: HTMLElement): void {
  const update = (): void => {
    // 以 .game-screen 自己的底邊為基準（CSS bottom 就是相對它），不依賴 window.innerHeight，
    // 避免 iOS Safari 動態工具列讓 innerHeight 與實際畫面高度不一致。
    const screenBottom = screen.getBoundingClientRect().bottom;
    const panelTop = panel.getBoundingClientRect().top;
    screen.style.setProperty('--stage-bottom', `${Math.max(0, Math.round(screenBottom - panelTop))}px`);
  };
  panelObserver?.disconnect();
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  update();
  if (typeof ResizeObserver !== 'undefined') {
    panelObserver = new ResizeObserver(update);
    panelObserver.observe(panel);
  }
  resizeHandler = update;
  window.addEventListener('resize', resizeHandler);
}

export function render(app: HTMLElement, engine: StoryEngine, content: LoadedContent, hooks: RenderHooks = {}): void {
  const scene = engine.currentScene;
  const visibleLines = engine.visibleLines;
  const lineIndex = engine.currentLineIndex;
  const line = engine.currentLine;
  const atLast = engine.atLastLine;
  const presentation = content.images.scenePresentation[scene.id];
  // 立繪 fallback：目前這一句（含）之前最後一位有立繪的說話者，讓立繪跟著對話走。
  const activeLine = visibleLines.slice(0, lineIndex + 1).reverse().find((item) => item.speaker && content.characters.has(item.speaker));
  const fallbackCharacterId = activeLine?.speaker ?? undefined;
  const characterId = presentation?.hideCharacter ? undefined : presentation?.character ?? fallbackCharacterId;
  const activeCharacter = characterId ? content.characters.get(characterId) : undefined;
  const sprite = activeCharacter ? content.images.characters[activeCharacter.id] : undefined;
  const expression = presentation?.expression ?? sprite?.defaultExpression;
  const frame = sprite && expression ? sprite.expressions[expression] ?? sprite.expressions[sprite.defaultExpression] ?? 0 : 0;
  const position = sprite && sprite.columns > 1 ? (frame / (sprite.columns - 1)) * 100 : 0;

  const backgroundId = presentation?.background ?? content.images.sceneBackgrounds[scene.id];
  const background = backgroundId ? content.images.backgrounds[backgroundId] : undefined;
  const sameScene = lastSceneId === scene.id;
  lastSceneId = scene.id;
  const transitionId = sameScene ? 'none' : presentation?.transition ?? 'none';
  const transition = content.images.transitions[transitionId];
  const transitionAsset = transition?.asset ? content.images.ui[transition.asset] : undefined;
  const dialoguePanel = content.images.ui.dialoguePanel;
  const choiceFrame = content.images.ui.choiceFrame;

  // 一次只顯示一句；點畫面（或 Enter／空白鍵）才到下一句。
  const canAdvance = !atLast || (scene.next !== undefined && !scene.ending);
  const speaker = line ? (line.speaker ? content.characters.get(line.speaker)?.displayName ?? line.speaker : content.ui.narratorName) : '';
  const dialogue = line
    ? `<article class="line" data-line="${lineIndex + 1}/${visibleLines.length}"><strong>${escapeHtml(speaker)}</strong><p>${escapeHtml(line.text)}</p></article>`
    : '';
  const hint = canAdvance ? `<span class="advance-hint" aria-hidden="true">▼</span>` : '';

  const choices = atLast
    ? engine.availableChoices.map((choice, index) =>
        `<button class="choice" data-choice="${escapeHtml(choice.id)}" style="--choice-frame:${cssUrl(choiceFrame)}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(choice.text)}</button>`,
      ).join('')
    : '';
  const action = atLast && scene.ending
    ? `<button class="primary-action full" id="restart">${escapeHtml(content.ui.restartLabel)}</button>`
    : choices
      ? `<section class="choices"><h2>${escapeHtml(content.ui.choicePrompt)}</h2>${choices}</section>`
      : '';

  app.innerHTML = `
    <section class="game-screen" data-transition="${escapeHtml(transitionId)}" data-advance="${canAdvance}" data-settled="${sameScene}" style="${imageStyle(background?.src, background?.focalPoint)};--transition-duration:${transition?.durationMs ?? 0}ms;--dialogue-panel:${cssUrl(dialoguePanel)}">
      <div class="scene-transition" aria-hidden="true" style="--transition-art:${cssUrl(transitionAsset)}"></div>
      <div class="scene-scrim" aria-hidden="true"></div>
      <header class="game-header"><p class="eyebrow">${escapeHtml(content.game.title)}</p><h1>${escapeHtml(scene.title ?? '')}</h1></header>
      ${sprite ? `<div class="character-stage" role="img" aria-label="${escapeHtml(sprite.alt)}" data-expression="${escapeHtml(expression ?? '')}" data-align="${escapeHtml(sprite.align ?? 'center')}"><div class="character-sprite" style="--sprite:url('${escapeHtml(sprite.src)}');--columns:${sprite.columns};--position:${position}%${sprite.frameAspectRatio ? `;--frame-aspect:${sprite.frameAspectRatio}` : ''}"></div></div>` : ''}
      <div class="story-panel"><section class="dialogue" aria-live="polite">${dialogue}${hint}</section><footer>${action}</footer></div>
    </section>
  `;

  const screenEl = app.querySelector<HTMLElement>('.game-screen');
  const panelEl = app.querySelector<HTMLElement>('.story-panel');
  if (screenEl && panelEl) keepStageAbovePanel(screenEl, panelEl);

  const advance = (): void => {
    if (!engine.advance()) return;
    render(app, engine, content, hooks);
    hooks.onAdvance?.();
  };

  app.querySelector<HTMLElement>('.game-screen')?.addEventListener('click', (event) => {
    // 按鈕（選項、重來）各自處理；其他地方點一下就是「下一句」。
    if ((event.target as HTMLElement).closest('button')) return;
    advance();
  });
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if ((event.target as HTMLElement | null)?.closest('button')) return;
    event.preventDefault();
    advance();
  };
  document.addEventListener('keydown', keyHandler);

  app.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      engine.choose(button.dataset.choice!);
      render(app, engine, content, hooks);
      hooks.onAdvance?.();
    });
  });
  app.querySelector<HTMLButtonElement>('#restart')?.addEventListener('click', () => {
    engine.restart();
    lastSceneId = undefined;
    render(app, engine, content, hooks);
    hooks.onRestart?.();
  });
}
