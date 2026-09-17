import type { LoadedContent } from '../data/contentLoader';
import type { Line } from '../domain/schema';
import type { StoryEngine } from '../engine/StoryEngine';
import { playCutscene } from './cutscene';
import { icon } from './icons';
import { setKeyHandler } from './keyboard';
import { resolvePresentation, spriteSource } from './presentation';

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

/**
 * 讀取畫面：素材預載完成（`ready`）後顯示「點擊繼續」，玩家點擊或按 Enter／空白鍵才進入遊戲。
 * 不再用計時器自動跳走。
 */
export function renderLoading(app: HTMLElement, content: LoadedContent, ready: Promise<unknown>, onContinue: () => void): void {
  const loading = content.images.screens.loading;
  app.innerHTML = `
    <section class="loading-screen" style="${imageStyle(loading?.src, loading?.focalPoint)}" aria-busy="true" data-ready="false">
      <div class="loading-copy">
        <p class="eyebrow">BEFORE WE TALK</p>
        <h1>${escapeHtml(content.ui.loadingLabel)}</h1>
        <p>有些話，需要先留一點空白。</p>
        <div class="loading-bar" role="progressbar" aria-label="${escapeHtml(content.ui.loadingLabel)}"><span></span></div>
        <p class="tap-hint loading-hint" role="status">${escapeHtml(content.ui.tapToContinueLabel)}</p>
      </div>
    </section>
  `;
  const screen = app.querySelector<HTMLElement>('.loading-screen');
  if (!screen) return;
  let isReady = false;
  let done = false;
  const proceed = (): void => {
    if (!isReady || done) return;
    done = true;
    setKeyHandler(undefined);
    onContinue();
  };
  // 預載失敗也放行，避免卡在讀取畫面；最短停留時間避免「開始」那一下連點直接跳過。
  void Promise.all([ready.catch(() => undefined), wait(MIN_DWELL_MS)]).then(() => {
    if (!screen.isConnected) return;
    isReady = true;
    screen.dataset.ready = 'true';
    screen.setAttribute('aria-busy', 'false');
  });
  screen.addEventListener('click', proceed);
  setKeyHandler((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    proceed();
  });
}

/** 讀取／轉場畫面出現後，至少停留這麼久才接受點擊，避免連點誤跳。 */
const MIN_DWELL_MS = 350;

/** 對話框左側這個比例的區塊是「回上一句」，其餘照舊是「下一句」。 */
const BACK_ZONE_RATIO = 1 / 3;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** 預載圖片；單張失敗或逾時都視為完成，不阻擋進入遊戲。 */
export function preloadImages(sources: Array<string | undefined>, timeoutMs = 6000): Promise<void> {
  const unique = [...new Set(sources.filter((src): src is string => typeof src === 'string' && src.length > 0))];
  const load = (src: string): Promise<void> => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
  return Promise.race([Promise.all(unique.map(load)).then(() => undefined), wait(timeoutMs)]);
}

/** 進入新場景後尚未被玩家點掉的轉場卡；值為場景 ID。 */
let pendingIntroSceneId: string | undefined;
/** 轉場卡剛被點掉：這次 render 播放轉場淡出與立繪淡入。 */
let revealSceneId: string | undefined;
/** 上一次 render 的場景；同場景內逐句前進時不重播轉場與立繪淡入。 */
let lastSceneId: string | undefined;
/** 上一次 render 顯示的立繪角色；換人時重播立繪淡入。 */
let lastCharacterId: string | undefined;
/** 上一次 render 的背景；同場景內換景（例如結局的「三週後」）時補一次轉場。 */
let lastBackgroundId: string | undefined;
/** 這次 render 是「回上一句」：接續上一畫面，不重播轉場卡、轉場動畫與立繪淡入。 */
let steppingBack = false;
/**
 * 上一次 render 有沒有顯示回上一句的箭頭。每次 render 都會重建 DOM，
 * 靠這個旗標判斷箭頭是「這次才出現」還是「本來就在」——只有前者播放一次淡入，
 * 否則每前進一句都會重播一次動畫（規格要求不做無限循環，也不該每句閃一下）。
 */
let backHintShown = false;
/**
 * 忘掉上一次 render 的場景紀錄，讓下一次 render 把目前場景當成「剛進場」：
 * 重播轉場卡與立繪淡入。重新開始與回到決策點這兩種跳躍都要這樣宣告。
 */
function resetSceneTracking(): void {
  lastSceneId = undefined;
  lastCharacterId = undefined;
  lastBackgroundId = undefined;
  pendingIntroSceneId = undefined;
  revealSceneId = undefined;
  steppingBack = false;
  backHintShown = false;
}

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

/** 依訊息發送者名稱找角色：完全相同，或顯示名稱以其結尾（「予安」→「周予安」）。 */
function findCharacterByName(content: LoadedContent, name: string | undefined): string | undefined {
  if (!name) return undefined;
  for (const character of content.characters.values()) {
    if (character.displayName === name || character.id === name) return character.id;
  }
  for (const character of content.characters.values()) {
    if (character.displayName.endsWith(name)) return character.id;
  }
  return undefined;
}

/** 訊息／內心泡泡的頭像：對得到角色時用名字後兩字（雨澄、予安），否則用第一個字（執行長 → 執）。 */
function avatarText(content: LoadedContent, senderId: string | undefined, fallbackName: string): string {
  const chars = Array.from((senderId ? content.characters.get(senderId)?.displayName : undefined) ?? fallbackName);
  return senderId ? chars.slice(-2).join('') : chars.slice(0, 1).join('');
}

/** 對話框上緣的名牌：對話與內心顯示說話者；玩家自己的台詞另加「你」標記與不同配色。內心不加標籤。 */
function renderNamePlate(line: Line, content: LoadedContent): string {
  const kind = line.kind ?? (line.speaker ? 'dialogue' : 'narration');
  if (kind !== 'dialogue' && kind !== 'thought') return '';
  const name = line.speaker ? content.characters.get(line.speaker)?.displayName ?? line.speaker : content.ui.narratorName;
  const self = line.speaker !== null && line.speaker === content.game.player;
  // 內心不另外加標籤：靠虛線泡泡本身區分。
  const tags = self ? `<span class="plate-tag plate-tag--self">${escapeHtml(content.ui.playerLabel)}</span>` : '';
  return `<div class="name-plate" data-self="${self}" data-kind="${kind}"><span class="plate-mark" aria-hidden="true"></span><span class="plate-name">${escapeHtml(name)}</span>${tags}</div>`;
}

/** 朗讀用的說話者前綴：對話與內心報名字，旁白報旁白，訊息報頻道與發送者。 */
function nameOf(line: Line, content: LoadedContent): string {
  const kind = line.kind ?? (line.speaker ? 'dialogue' : 'narration');
  const speakerName = line.speaker ? content.characters.get(line.speaker)?.displayName ?? line.speaker : '';
  if (kind === 'narration') return `${content.ui.narratorName}：`;
  if (kind === 'message') return `${line.channel ? `${line.channel}，` : ''}${line.from ?? speakerName}：`;
  return `${speakerName}：`;
}

/**
 * 螢幕閱讀器播報：每次 render 都會整段換掉 `#app`，重新插入的 live region 不一定會被朗讀，
 * 因此在 `#app` 之外保留一個常駐的 live region，只更新它的文字。
 */
function announce(text: string): void {
  if (typeof document === 'undefined') return;
  let region = document.getElementById('story-announcer');
  if (!region) {
    region = document.createElement('div');
    region.id = 'story-announcer';
    region.className = 'visually-hidden';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  region.textContent = text;
}

function renderLine(line: Line, content: LoadedContent, progress: string): string {
  const kind = line.kind ?? (line.speaker ? 'dialogue' : 'narration');
  const speakerName = line.speaker ? content.characters.get(line.speaker)?.displayName ?? line.speaker : '';
  const self = line.speaker !== null && line.speaker === content.game.player;
  const text = `<p>${escapeHtml(line.text)}</p>`;

  switch (kind) {
    case 'thought': {
      // 內心：名字放在對話框名牌上；本體是來源端泡泡（頭像在左、泡泡尾朝向想的人），
      // 邊框虛線、底色透明，讀起來是「沒說出口的話」。
      const thinker = speakerName || content.ui.narratorName;
      const avatar = avatarText(content, line.speaker ?? undefined, thinker);
      return `<article class="line line--thought${self ? ' is-self' : ''}" data-kind="thought" data-line="${progress}">
        <div class="message-row">
          <span class="message-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
          <div class="message-bubble">${text}</div>
        </div>
      </article>`;
    }
    case 'narration':
      return `<article class="line line--narration" data-kind="narration" data-line="${progress}" aria-label="${escapeHtml(content.ui.narratorName)}">${text}</article>`;
    case 'message': {
      const senderId = line.speaker ?? findCharacterByName(content, line.from);
      const sender = line.from ?? speakerName;
      const selfMessage = senderId !== undefined && senderId === content.game.player;
      const avatar = avatarText(content, senderId, sender);
      return `<article class="line line--message${selfMessage ? ' is-self' : ''}" data-kind="message" data-line="${progress}">
        <div class="message-meta">${line.channel ? `<span class="message-channel">${escapeHtml(line.channel)}</span>` : ''}</div>
        <div class="message-row">
          <span class="message-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
          <div class="message-bubble"><strong>${escapeHtml(sender)}${selfMessage ? `<span class="plate-tag plate-tag--self">${escapeHtml(content.ui.playerLabel)}</span>` : ''}</strong>${text}</div>
        </div>
      </article>`;
    }
    default:
      // 對話：名字在名牌上，這裡只放台詞。
      return `<article class="line line--dialogue${self ? ' is-self' : ''}" data-kind="dialogue" data-line="${progress}">${text}</article>`;
  }
}

export function render(app: HTMLElement, engine: StoryEngine, content: LoadedContent, hooks: RenderHooks = {}): void {
  const scene = engine.currentScene;

  // 進入掛有過場影片的場景時，先播影片再進場景。已看過（含跳過）的不重播；
  // 缺檔或載入失敗由播放器自行跳過，直接進入正式場景。
  // 這一段刻意放在所有轉場記錄（lastSceneId 等）之前：播完後重新 render 時，
  // 這個場景仍然算「剛進場」，轉場卡與立繪淡入照常播放。
  const cue = content.cutsceneCues.get(scene.id);
  if (cue && lastSceneId !== scene.id && !engine.hasWatchedCutscene(cue.id)) {
    playCutscene(app, cue, content.ui, () => {
      engine.markCutsceneWatched(cue.id);
      // 影片看過就記進存檔，重新載入不會再看一次。
      hooks.onAdvance?.();
      render(app, engine, content, hooks);
    });
    return;
  }

  const visibleLines = engine.visibleLines;
  const lineIndex = engine.currentLineIndex;
  const line = engine.currentLine;
  const atLast = engine.atLastLine;
  const presentation = content.images.scenePresentation[scene.id];
  // 背景與立繪都依「讀到第幾句」決定：台詞可用 background／character 在場景中途換景或送角色離場，
  // 沒有指定時立繪跟著說話者走，再退回場景層級設定。
  const { backgroundId, characterId } = resolvePresentation(visibleLines, lineIndex, {
    presentation,
    sceneBackground: content.images.sceneBackgrounds[scene.id],
    hasSprite: (id) => content.images.characters[id] !== undefined,
  });
  const activeCharacter = characterId ? content.characters.get(characterId) : undefined;
  const sprite = activeCharacter ? content.images.characters[activeCharacter.id] : undefined;
  // 場景指定的表情只套在場景指定的那位角色上；換成別人時用該角色的預設表情。
  const expression = (characterId === presentation?.character ? presentation?.expression : undefined) ?? sprite?.defaultExpression;
  const frame = sprite && expression ? sprite.expressions[expression] ?? sprite.expressions[sprite.defaultExpression] ?? 0 : 0;
  const position = sprite && sprite.columns > 1 ? (frame / (sprite.columns - 1)) * 100 : 0;
  // 逐張素材時每個表情是一張獨立的圖；sprite sheet 則永遠是同一張，靠 --position 位移。
  const spriteUrl = sprite ? spriteSource(sprite, expression) : undefined;

  const background = backgroundId ? content.images.backgrounds[backgroundId] : undefined;
  const sceneTransition = presentation?.transition ?? 'none';
  // 回上一句：把「上一次 render」的紀錄對齊這一句，避免被當成進新場景而重播轉場卡與淡入。
  if (steppingBack) {
    steppingBack = false;
    lastSceneId = scene.id;
    lastCharacterId = characterId;
    lastBackgroundId = backgroundId;
    pendingIntroSceneId = undefined;
    revealSceneId = undefined;
  }
  const enteringScene = lastSceneId !== scene.id;
  lastSceneId = scene.id;
  // 進入有轉場的新場景：先停在轉場卡，等玩家點擊才顯示對話。
  if (enteringScene) {
    pendingIntroSceneId = sceneTransition !== 'none' ? scene.id : undefined;
    revealSceneId = undefined;
  }
  const phase: 'intro' | 'reveal' | 'play' = pendingIntroSceneId === scene.id ? 'intro' : revealSceneId === scene.id ? 'reveal' : 'play';
  if (phase === 'reveal') revealSceneId = undefined;
  // settled＝不重播立繪淡入：只有剛進場（無轉場卡）、剛點掉轉場卡，或立繪換人時才播放。
  const characterChanged = lastCharacterId !== characterId;
  lastCharacterId = characterId;
  const backgroundChanged = !enteringScene && lastBackgroundId !== backgroundId;
  lastBackgroundId = backgroundId;
  const sameScene = !enteringScene && phase === 'play' && !characterChanged;
  // 同場景內換景（結局的時間跳躍）不該是硬切，補一次場景自己的轉場。
  const transitionId = phase === 'play' && !enteringScene ? (backgroundChanged ? sceneTransition : 'none') : sceneTransition;
  const transition = content.images.transitions[transitionId];
  const transitionAsset = transition?.asset ? content.images.ui[transition.asset] : undefined;
  const dialoguePanel = content.images.ui.dialoguePanel;

  // 一次只顯示一句；點畫面（或 Enter／空白鍵）才到下一句。
  const canAdvance = phase === 'intro' || !atLast || (scene.next !== undefined && !scene.ending);
  const dialogue = line ? renderLine(line, content, `${lineIndex + 1}/${visibleLines.length}`) : '';
  const namePlate = line ? renderNamePlate(line, content) : '';
  const speakingSelf = line !== undefined && line.speaker !== null && line.speaker === content.game.player;
  const hint = canAdvance ? `<span class="advance-hint" aria-hidden="true">▼</span>` : '';
  // 停在轉場卡時畫面上還沒有台詞，不提供回溯。
  const canGoBack = phase !== 'intro' && engine.canGoBack;
  // 箭頭剛出現時才播那一次 180ms 淡入；之後每一句都只是重建同一顆按鈕，不再播。
  const backHintEntering = canGoBack && !backHintShown;
  backHintShown = canGoBack;
  const backHint = canGoBack
    ? `<button type="button" class="back-hint${backHintEntering ? ' back-hint--enter' : ''}" id="back" aria-label="${escapeHtml(content.ui.backLabel)}">${icon('back')}</button>`
    : '';

  const choices = atLast
    ? engine.availableChoices.map((choice, index) =>
        `<button class="choice" data-choice="${escapeHtml(choice.id)}"><span>${String(index + 1).padStart(2, '0')}</span><span class="choice-text">${escapeHtml(choice.text)}</span></button>`,
      ).join('')
    : '';
  // 通關畫面：除了重新開始，還可以挑一個之前的決策點回去重選。
  const decisionCount = engine.decisionPoints.length;
  const action = atLast && scene.ending
    ? `<div class="ending-actions">
        <button class="primary-action full" id="restart">${escapeHtml(content.ui.restartLabel)}</button>
        ${decisionCount > 0 ? `<button type="button" class="secondary-action full" id="rewind">${escapeHtml(content.ui.rewindLabel)}</button>` : ''}
      </div>`
    : choices
      ? `<section class="choices"><h2>${escapeHtml(content.ui.choicePrompt)}</h2>${choices}</section>`
      : '';

  app.innerHTML = `
    <section class="game-screen" data-phase="${phase}" data-transition="${escapeHtml(transitionId)}" data-advance="${canAdvance}" data-can-back="${canGoBack}" data-settled="${sameScene}" data-has-choices="${atLast && choices !== ''}" style="${imageStyle(background?.src, background?.focalPoint)};--transition-duration:${transition?.durationMs ?? 0}ms;--dialogue-panel:${cssUrl(dialoguePanel)}">
      <div class="scene-transition" aria-hidden="true" style="--transition-art:${cssUrl(transitionAsset)}"></div>
      ${phase === 'intro' ? `<div class="scene-intro" role="status"><p class="eyebrow">${escapeHtml(content.game.title)}</p>${scene.title ? `<h2>${escapeHtml(scene.title)}</h2>` : ''}<p class="tap-hint">${escapeHtml(content.ui.tapToContinueLabel)}</p></div>` : ''}
      <div class="scene-scrim" aria-hidden="true"></div>
      <header class="game-header"><p class="eyebrow">${escapeHtml(content.game.title)}</p><h1>${escapeHtml(scene.title ?? '')}</h1></header>
      ${sprite ? `<div class="character-stage" role="img" aria-label="${escapeHtml(sprite.alt)}" data-expression="${escapeHtml(expression ?? '')}" data-align="${escapeHtml(sprite.align ?? 'center')}"><div class="character-sprite" style="--sprite:url('${escapeHtml(spriteUrl ?? sprite.src)}');--columns:${sprite.columns};--position:${position}%${sprite.frameAspectRatio ? `;--frame-aspect:${sprite.frameAspectRatio}` : ''}"></div></div>` : ''}
      <div class="story-panel" data-self="${speakingSelf}" data-kind="${escapeHtml(line?.kind ?? '')}">${namePlate}<section class="dialogue">${dialogue}${hint}</section><footer>${action}</footer>${backHint}</div>
    </section>
  `;

  announce(line ? `${nameOf(line, content)}${line.text}` : scene.title ?? '');

  const screenEl = app.querySelector<HTMLElement>('.game-screen');
  const panelEl = app.querySelector<HTMLElement>('.story-panel');
  if (screenEl && panelEl) keepStageAbovePanel(screenEl, panelEl);

  const shownAt = performance.now();
  const advance = (): void => {
    if (phase === 'intro') {
      // 轉場卡：停留太短的點擊視為連點，忽略。
      if (performance.now() - shownAt < MIN_DWELL_MS) return;
      pendingIntroSceneId = undefined;
      revealSceneId = scene.id;
      render(app, engine, content, hooks);
      return;
    }
    if (!engine.advance()) return;
    render(app, engine, content, hooks);
    hooks.onAdvance?.();
  };

  const goBack = (): void => {
    if (!canGoBack || !engine.back()) return;
    steppingBack = true;
    render(app, engine, content, hooks);
    // 存檔跟著退回，重新載入不會又跳到後面那一句。
    hooks.onAdvance?.();
  };

  /** 點擊落在對話框左側 1/3、且確實有上一句可回時，才算「回上一句」。 */
  const isBackZone = (event: MouseEvent): boolean => {
    if (!canGoBack) return false;
    const panel = (event.target as HTMLElement).closest('.story-panel');
    if (!panel) return false;
    const rect = panel.getBoundingClientRect();
    return event.clientX < rect.left + rect.width * BACK_ZONE_RATIO;
  };

  app.querySelector<HTMLElement>('.game-screen')?.addEventListener('click', (event) => {
    // 按鈕（選項、重來、回上一句）各自處理；其他地方點一下就是「下一句」。
    if ((event.target as HTMLElement).closest('button')) return;
    if (isBackZone(event)) {
      goBack();
      return;
    }
    advance();
  });
  app.querySelector<HTMLButtonElement>('#back')?.addEventListener('click', goBack);
  setKeyHandler((event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goBack();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if ((event.target as HTMLElement | null)?.closest('button')) return;
    event.preventDefault();
    advance();
  });

  app.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const choiceId = button.dataset.choice!;
      // 畫面已經換掉之後才送達的殘留點擊：忽略即可，不該讓整個 UI 拋例外。
      if (!engine.availableChoices.some((choice) => choice.id === choiceId)) return;
      engine.choose(choiceId);
      render(app, engine, content, hooks);
      hooks.onAdvance?.();
    });
  });
  app.querySelector<HTMLButtonElement>('#restart')?.addEventListener('click', () => {
    engine.restart();
    resetSceneTracking();
    render(app, engine, content, hooks);
    hooks.onRestart?.();
  });
  app.querySelector<HTMLButtonElement>('#rewind')?.addEventListener('click', () => {
    openDecisionMenu(app, engine, content, hooks);
  });
}

/**
 * 通關後的決策點選單：列出這一輪做過的每一個選擇，點任一項就回到按下該選項之前，
 * 從那裡重新選、重新往下走。被回到的那個決策點與其後的紀錄一併作廢。
 *
 * 選單蓋在遊戲畫面上（不取代它），因此關閉後畫面還是原本那個結局。
 */
function openDecisionMenu(app: HTMLElement, engine: StoryEngine, content: LoadedContent, hooks: RenderHooks): void {
  const decisions = engine.decisionPoints;
  if (decisions.length === 0) return;

  const items = decisions.map((decision, index) => {
    const scene = content.scenes.get(decision.sceneId);
    const picked = scene?.choices.find((choice) => choice.id === decision.choiceId);
    return `<li>
      <button type="button" class="choice decision-item" data-decision="${index}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <span class="choice-text">
          <span class="decision-scene">${escapeHtml(scene?.title ?? decision.sceneId)}</span>
          <span class="decision-choice">${escapeHtml(content.ui.rewindChoiceLabel)}${escapeHtml(picked?.text ?? decision.choiceId)}</span>
        </span>
      </button>
    </li>`;
  }).join('');

  const overlay = document.createElement('section');
  overlay.className = 'decision-menu';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', content.ui.rewindPrompt);
  overlay.innerHTML = `
    <div class="decision-panel">
      <h2>${escapeHtml(content.ui.rewindPrompt)}</h2>
      <ol class="decision-list">${items}</ol>
      <button type="button" class="secondary-action decision-close" id="decision-close">${escapeHtml(content.ui.rewindCloseLabel)}</button>
    </div>
  `;
  app.appendChild(overlay);

  const focusable = (): HTMLButtonElement[] => [...overlay.querySelectorAll<HTMLButtonElement>('button')];
  focusable()[0]?.focus();

  const close = (): void => {
    overlay.remove();
    setKeyHandler(undefined);
    // 重畫結局畫面，把鍵盤與點擊處理器交還給它，並把焦點還給開啟選單的按鈕。
    render(app, engine, content, hooks);
    app.querySelector<HTMLButtonElement>('#rewind')?.focus();
  };

  overlay.addEventListener('click', (event) => {
    // 點面板以外的地方（遮罩）等同關閉；點到底下的遊戲畫面不會推進劇情，因為事件停在這一層。
    if (event.target === overlay) close();
  });
  overlay.querySelector<HTMLButtonElement>('#decision-close')?.addEventListener('click', close);

  overlay.querySelectorAll<HTMLButtonElement>('[data-decision]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.decision);
      if (!engine.rewindTo(index)) return;
      overlay.remove();
      setKeyHandler(undefined);
      // 回到決策點是一次跳躍：讓該場景重播轉場卡再顯示那一句，玩家才知道自己被送到哪裡。
      resetSceneTracking();
      render(app, engine, content, hooks);
      // 存檔跟著跳回去，重新載入不會又回到結局。
      hooks.onAdvance?.();
    });
  });

  setKeyHandler((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      // 焦點留在選單內，不讓 Tab 跑到底下已經被蓋住的結局畫面。
      const buttons = focusable();
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    // 其餘會推進劇情的按鍵在選單開著時一律不生效（按鈕自己的 Enter／空白鍵照常）。
    if ((event.key === 'Enter' || event.key === ' ') && (event.target as HTMLElement | null)?.closest('button')) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowLeft') event.preventDefault();
  });
}
