import type { LoadedContent } from '../data/contentLoader';
import type { Line } from '../domain/schema';
import type { StoryEngine } from '../engine/StoryEngine';
import { playCutscene } from './cutscene';
import { icon } from './icons';
import { setKeyHandler } from './keyboard';
import { resolveCharacterFraming, resolvePresentation, spriteSource } from './presentation';
import { planTyping, runTyping, type TypingHandle, type TypingPlan } from './typing';

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
        <p class="loading-note">${escapeHtml(content.ui.loadingNote)}</p>
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

/** 已經請求過的圖片，避免重複建立 Image 物件重跑同一批來源。 */
const requestedImages = new Set<string>();

function loadImage(src: string): Promise<void> {
  requestedImages.add(src);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

function uniqueSources(sources: Array<string | undefined>): string[] {
  return [...new Set(sources.filter((src): src is string => typeof src === 'string' && src.length > 0))];
}

/** 預載圖片；單張失敗或逾時都視為完成，不阻擋進入遊戲。 */
export function preloadImages(sources: Array<string | undefined>, timeoutMs = 6000): Promise<void> {
  const unique = uniqueSources(sources);
  return Promise.race([Promise.all(unique.map(loadImage)).then(() => undefined), wait(timeoutMs)]);
}

/**
 * 背景預取：讀取畫面只擋「這一場需要的圖」，其餘素材等瀏覽器閒下來再慢慢拿，
 * 玩家換場景、換表情時就不必現場等。已經請求過的不重複請求，也不回報結果——
 * 失敗沒關係，真的用到時 `preloadImages` 或 CSS 會再要一次。
 */
export function prefetchImages(sources: Array<string | undefined>): void {
  const pending = uniqueSources(sources).filter((src) => !requestedImages.has(src));
  if (pending.length === 0) return;
  const run = (): void => { pending.forEach((src) => { void loadImage(src); }); };
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof idle === 'function') idle(run, { timeout: 2000 });
  else window.setTimeout(run, 300);
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
 * 已經從最後一句翻到「選項頁」的場景 ID。
 *
 * 台詞與選項分成兩次點擊：讀完最後一句時先只顯示那一句（照常有 ▼），再點一下才換成只有選項的
 * 一頁。這樣對話框一次只裝一種內容，不必同時容納台詞與三個選項——這是把對話框收矮最有效的一步。
 * 選項頁不是引擎狀態（引擎仍停在最後一句），所以只記在這裡；按回上一句就是退回那一句。
 */
let choiceStepSceneId: string | undefined;
/**
 * 上一次 render 有沒有顯示回上一句的箭頭。每次 render 都會重建 DOM，
 * 靠這個旗標判斷箭頭是「這次才出現」還是「本來就在」——只有前者播放一次淡入，
 * 否則每前進一句都會重播一次動畫（規格要求不做無限循環，也不該每句閃一下）。
 */
let backHintShown = false;
/**
 * 正在播放的打字特效（私訊）。畫面每次重畫都會先中止它；播放期間點畫面＝立刻打完，不前進。
 */
let activeTyping: TypingHandle | undefined;
/**
 * 已經播過打字特效的台詞（`場景 ID#第幾句`）。同一句只演一次：
 * 回上一句再前進、或在同一場來回時不該每次都重打一遍。重新開始與回到決策點會清空。
 */
const typedLines = new Set<string>();
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
  choiceStepSceneId = undefined;
  typedLines.clear();
}

/** 使用者要求減少動態時不播打字特效，直接顯示整句。 */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * 舊的 keepStageAbovePanel（用 ResizeObserver 量對話框高度、寫進 --stage-bottom）已移除。
 * 立繪不再被夾在對話框上方：桌機與橫版改成疊在對話框之上、下緣由畫面底邊裁掉，
 * 手機直版也只露半身、下半身由對話框蓋住，兩種版位都不需要知道面板多高。
 */

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

/**
 * 台詞的文字節點。要播打字特效時多包一層：
 * `.line-sizer` 是整段最長的文字、`visibility:hidden` 只用來把高度先撐好，
 * `.line-live` 疊在它上面顯示目前打到哪裡。否則打字時每多一行，對話框就會往上長一次。
 */
function renderText(line: Line, typing: TypingPlan | undefined): string {
  if (!typing) return `<p>${escapeHtml(line.text)}</p>`;
  return `<p class="line-text"><span class="line-sizer" aria-hidden="true">${escapeHtml(typing.sizerText)}</span><span class="line-live"></span></p>`;
}

function renderLine(line: Line, content: LoadedContent, progress: string, typing?: TypingPlan): string {
  const kind = line.kind ?? (line.speaker ? 'dialogue' : 'narration');
  const speakerName = line.speaker ? content.characters.get(line.speaker)?.displayName ?? line.speaker : '';
  const self = line.speaker !== null && line.speaker === content.game.player;
  const text = renderText(line, typing);
  // 打字期間先掛上 is-composing（游標、訊息泡泡壓暗）；打完由 render 拿掉。
  const composing = typing ? ' is-composing' : '';

  switch (kind) {
    case 'thought': {
      // 內心：名字放在對話框名牌上；本體是來源端泡泡（頭像在左、泡泡尾朝向想的人），
      // 邊框虛線、底色透明，讀起來是「沒說出口的話」。
      const thinker = speakerName || content.ui.narratorName;
      const avatar = avatarText(content, line.speaker ?? undefined, thinker);
      return `<article class="line line--thought${self ? ' is-self' : ''}${composing}" data-kind="thought" data-line="${progress}">
        <div class="message-row">
          <span class="message-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
          <div class="message-bubble">${text}</div>
        </div>
      </article>`;
    }
    case 'narration':
      return `<article class="line line--narration${composing}" data-kind="narration" data-line="${progress}" aria-label="${escapeHtml(content.ui.narratorName)}">${text}</article>`;
    case 'message': {
      const senderId = line.speaker ?? findCharacterByName(content, line.from);
      const sender = line.from ?? speakerName;
      const selfMessage = senderId !== undefined && senderId === content.game.player;
      const avatar = avatarText(content, senderId, sender);
      return `<article class="line line--message${selfMessage ? ' is-self' : ''}${composing}" data-kind="message" data-line="${progress}">
        <div class="message-meta">${line.channel ? `<span class="message-channel">${escapeHtml(line.channel)}</span>` : ''}</div>
        <div class="message-row">
          <span class="message-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
          <div class="message-bubble"><strong>${escapeHtml(sender)}${selfMessage ? `<span class="plate-tag plate-tag--self">${escapeHtml(content.ui.playerLabel)}</span>` : ''}</strong>${text}</div>
        </div>
      </article>`;
    }
    default:
      // 對話：名字在名牌上，這裡只放台詞。
      return `<article class="line line--dialogue${self ? ' is-self' : ''}${composing}" data-kind="dialogue" data-line="${progress}">${text}</article>`;
  }
}

/**
 * 把打字特效接到剛畫好的台詞上：文字寫進 `.line-live`（高度由旁邊的 `.line-sizer` 撐著，
 * 所以打字時對話框不會一行一行變高），打完拿掉 `is-composing`，訊息再加一次 `is-sent` 的送出動作。
 */
function startTyping(app: HTMLElement, plan: TypingPlan, typingKey: string): void {
  const screen = app.querySelector<HTMLElement>('.game-screen');
  const article = app.querySelector<HTMLElement>('.dialogue .line');
  const live = app.querySelector<HTMLElement>('.dialogue .line-live');
  const paragraph = live?.parentElement;
  if (!screen || !article || !live || !paragraph) return;

  activeTyping = runTyping(plan, {
    write: (text) => { live.textContent = text; },
    onSend: () => { article.classList.add('is-sent'); },
    onDone: () => {
      // 演完就把撐高度的那一層拆掉，DOM 回到「沒有特效時本來就會長的樣子」，
      // 文字不再一式兩份（複製、選取、之後的版位量測都以這一份為準）。
      paragraph.classList.remove('line-text');
      paragraph.textContent = plan.finalText;
      article.classList.remove('is-composing');
      screen.dataset.typing = 'false';
      typedLines.add(typingKey);
      activeTyping = undefined;
    },
  });
}

export function render(app: HTMLElement, engine: StoryEngine, content: LoadedContent, hooks: RenderHooks = {}): void {
  const scene = engine.currentScene;
  // 畫面要重畫了：上一句的打字特效連同它的計時器一起收掉，不要寫進已經被換掉的節點。
  activeTyping?.cancel();
  activeTyping = undefined;

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
  const background = backgroundId ? content.images.backgrounds[backgroundId] : undefined;
  // 取景由「目前這張背景」決定（規格見 property/VISUALS.md）：寬景全身、會議室近景只露上半身、
  // 劇情 CG 不疊立繪。場景可在確有分鏡需求時覆寫；都沒寫就是 full。
  const framing = resolveCharacterFraming(presentation, background);
  const activeCharacter = framing === 'none' || !characterId ? undefined : content.characters.get(characterId);
  const sprite = activeCharacter ? content.images.characters[activeCharacter.id] : undefined;
  // 場景指定的表情只套在場景指定的那位角色上；換成別人時用該角色的預設表情。
  const expression = (characterId === presentation?.character ? presentation?.expression : undefined) ?? sprite?.defaultExpression;
  const frame = sprite && expression ? sprite.expressions[expression] ?? sprite.expressions[sprite.defaultExpression] ?? 0 : 0;
  const position = sprite && sprite.columns > 1 ? (frame / (sprite.columns - 1)) * 100 : 0;
  // 逐張素材時每個表情是一張獨立的圖；sprite sheet 則永遠是同一張，靠 --position 位移。
  const spriteUrl = sprite ? spriteSource(sprite, expression) : undefined;

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
    choiceStepSceneId = undefined;
  }
  // 台詞與選項分成兩次：讀完最後一句再點一下才翻到選項頁，對話框因此一次只放一種內容。
  const availableChoices = atLast ? engine.availableChoices : [];
  const atChoiceStep = availableChoices.length > 0 && choiceStepSceneId === scene.id;
  const phase: 'intro' | 'reveal' | 'play' = pendingIntroSceneId === scene.id ? 'intro' : revealSceneId === scene.id ? 'reveal' : 'play';
  if (phase === 'reveal') revealSceneId = undefined;
  // settled＝不重播立繪淡入：只有剛進場（無轉場卡）、剛點掉轉場卡，或立繪換人時才播放。
  const shownCharacterId = activeCharacter?.id;
  const characterChanged = lastCharacterId !== shownCharacterId;
  lastCharacterId = shownCharacterId;
  const backgroundChanged = !enteringScene && lastBackgroundId !== backgroundId;
  lastBackgroundId = backgroundId;
  const sameScene = !enteringScene && phase === 'play' && !characterChanged;
  // 同場景內換景（結局的時間跳躍）不該是硬切，補一次場景自己的轉場。
  const transitionId = phase === 'play' && !enteringScene ? (backgroundChanged ? sceneTransition : 'none') : sceneTransition;
  const transition = content.images.transitions[transitionId];
  const transitionAsset = transition?.asset ? content.images.ui[transition.asset] : undefined;
  const dialoguePanel = content.images.ui.dialoguePanel;

  // 一次只顯示一句；點畫面（或 Enter／空白鍵）才到下一句。讀完最後一句時，
  // 「下一步」是翻到選項頁（見 choiceStepSceneId），不是前進劇情。
  const canAdvance = phase === 'intro' || !atLast
    || (availableChoices.length > 0 && !atChoiceStep)
    || (scene.next !== undefined && !scene.ending);
  // 私訊的打字特效：訊息逐字打出來再送出，宣告了 drafts 的台詞先演一次「打了又刪掉」。
  // 只在這一句「第一次往前讀到」時播：停在轉場卡（台詞還看不到）、回上一句、以及使用者
  // 要求減少動態時都直接顯示整句。
  const typingKey = `${scene.id}#${lineIndex}`;
  const typing = line && !atChoiceStep && phase !== 'intro' && !typedLines.has(typingKey) && !prefersReducedMotion()
    ? planTyping(line)
    : undefined;
  // 選項頁只放選項：不顯示台詞與名牌，對話框因此矮一截。想重看那一句就按回上一句。
  const dialogue = line && !atChoiceStep ? renderLine(line, content, `${lineIndex + 1}/${visibleLines.length}`, typing) : '';
  const namePlate = line && !atChoiceStep ? renderNamePlate(line, content) : '';
  const speakingSelf = !atChoiceStep && line !== undefined && line.speaker !== null && line.speaker === content.game.player;
  const hint = canAdvance ? `<span class="advance-hint" aria-hidden="true">▼</span>` : '';
  // 停在轉場卡時畫面上還沒有台詞，不提供回溯。選項頁一定回得去（退回剛才那一句）。
  const canGoBack = phase !== 'intro' && (atChoiceStep || engine.canGoBack);
  // 箭頭剛出現時才播那一次 180ms 淡入；之後每一句都只是重建同一顆按鈕，不再播。
  const backHintEntering = canGoBack && !backHintShown;
  backHintShown = canGoBack;
  const backHint = canGoBack
    ? `<button type="button" class="back-hint${backHintEntering ? ' back-hint--enter' : ''}" id="back" aria-label="${escapeHtml(content.ui.backLabel)}">${icon('back')}</button>`
    : '';

  const choices = atChoiceStep
    ? availableChoices.map((choice, index) =>
        `<button class="choice" data-choice="${escapeHtml(choice.id)}"><span>${String(index + 1).padStart(2, '0')}</span><span class="choice-text">${escapeHtml(choice.text)}</span></button>`,
      ).join('')
    : '';
  // 通關畫面：除了重新開始，還可以挑一個之前的決策點回去重選。
  const decisionCount = engine.decisionPoints.length;
  const isEnding = atLast && scene.ending;
  // 對話框底部這次放什麼：結局按鈕／選項／什麼都沒有。CSS 用它決定要單欄還是雙欄
  // （只有結局畫面維持「台詞在左、按鈕在右」；台詞頁與選項頁都是單欄，台詞才不會被擠窄）。
  const footerKind = isEnding ? 'ending' : atChoiceStep ? 'choices' : 'none';
  const action = atLast && scene.ending
    ? `<div class="ending-actions">
        <button class="primary-action full" id="restart">${escapeHtml(content.ui.restartLabel)}</button>
        ${decisionCount > 0 ? `<button type="button" class="secondary-action full" id="rewind">${escapeHtml(content.ui.rewindLabel)}</button>` : ''}
      </div>`
    : choices
      ? `<section class="choices"><h2>${escapeHtml(content.ui.choicePrompt)}</h2>${choices}</section>`
      : '';

  app.innerHTML = `
    <section class="game-screen" data-phase="${phase}" data-transition="${escapeHtml(transitionId)}" data-advance="${canAdvance}" data-can-back="${canGoBack}" data-typing="${typing !== undefined}" data-settled="${sameScene}" data-has-choices="${atChoiceStep}" data-portrait="${sprite !== undefined}" data-framing="${escapeHtml(framing)}" style="${imageStyle(background?.src, background?.focalPoint)};--transition-duration:${transition?.durationMs ?? 0}ms;--dialogue-panel:${cssUrl(dialoguePanel)}${sprite?.frameAspectRatio ? `;--frame-aspect:${sprite.frameAspectRatio}` : ''}">
      <div class="scene-transition" aria-hidden="true" style="--transition-art:${cssUrl(transitionAsset)}"></div>
      ${phase === 'intro' ? `<div class="scene-intro" role="status"><p class="eyebrow">${escapeHtml(content.game.title)}</p>${scene.title ? `<h2>${escapeHtml(scene.title)}</h2>` : ''}<p class="tap-hint">${escapeHtml(content.ui.tapToContinueLabel)}</p></div>` : ''}
      <div class="scene-scrim" aria-hidden="true"></div>
      <header class="game-header"><p class="eyebrow">${escapeHtml(content.game.title)}</p><h1>${escapeHtml(scene.title ?? '')}</h1></header>
      ${sprite ? `<div class="character-stage" role="img" aria-label="${escapeHtml(sprite.alt)}" data-expression="${escapeHtml(expression ?? '')}" data-align="${escapeHtml(sprite.align ?? 'center')}" data-framing="${escapeHtml(framing)}"><div class="character-sprite" style="--sprite:url('${escapeHtml(spriteUrl ?? sprite.src)}');--columns:${sprite.columns};--position:${position}%${sprite.frameAspectRatio ? `;--frame-aspect:${sprite.frameAspectRatio}` : ''}"></div></div>` : ''}
      <div class="story-panel" data-self="${speakingSelf}" data-footer="${footerKind}" data-kind="${escapeHtml(atChoiceStep ? 'choices' : line?.kind ?? '')}">${namePlate}${atChoiceStep ? '' : `<section class="dialogue">${dialogue}</section>`}<footer>${action}</footer>${backHint}${hint}</div>
    </section>
  `;

  // 播報用的 live region 一開始就拿到整句：螢幕閱讀器不必等打字演完。
  announce(atChoiceStep ? content.ui.choicePrompt : line ? `${nameOf(line, content)}${line.text}` : scene.title ?? '');

  if (typing) startTyping(app, typing, typingKey);

  const shownAt = performance.now();
  const advance = (): void => {
    // 還在打字：先把這一句打完，不前進。
    if (activeTyping) {
      activeTyping.finish();
      return;
    }
    if (phase === 'intro') {
      // 轉場卡：停留太短的點擊視為連點，忽略。
      if (performance.now() - shownAt < MIN_DWELL_MS) return;
      pendingIntroSceneId = undefined;
      revealSceneId = scene.id;
      render(app, engine, content, hooks);
      return;
    }
    // 最後一句之後的下一步是翻到選項頁。引擎不動（仍停在最後一句），
    // 所以不用存檔——重新載入會回到那一句，再點一下就是選項頁。
    if (availableChoices.length > 0 && !atChoiceStep) {
      choiceStepSceneId = scene.id;
      render(app, engine, content, hooks);
      return;
    }
    if (!engine.advance()) return;
    render(app, engine, content, hooks);
    hooks.onAdvance?.();
  };

  const goBack = (): void => {
    if (!canGoBack) return;
    // 在選項頁按回上一句：翻回剛才那一句，引擎不動。
    if (atChoiceStep) {
      choiceStepSceneId = undefined;
      steppingBack = true;
      render(app, engine, content, hooks);
      return;
    }
    if (!engine.back()) return;
    steppingBack = true;
    render(app, engine, content, hooks);
    // 存檔跟著退回，重新載入不會又跳到後面那一句。
    hooks.onAdvance?.();
  };

  /**
   * 點擊落在台詞區左側 1/3、且確實有上一句可回時，才算「回上一句」。
   *
   * 基準是台詞區（.dialogue）而不是整個對話框：桌機與橫版的立繪站在對話框左邊、蓋住它的左半邊，
   * 若以對話框為基準，點到人物就會被算成「回上一句」。改以台詞區的左右範圍判斷後，
   * 點人物＝下一句（和點畫面其他地方一致），只有真的點在台詞左側才回上一句。
   */
  const isBackZone = (event: MouseEvent): boolean => {
    if (!canGoBack) return false;
    if (!(event.target as HTMLElement).closest('.story-panel')) return false;
    const dialogueEl = app.querySelector<HTMLElement>('.dialogue');
    if (!dialogueEl) return false;
    const rect = dialogueEl.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX < rect.left + rect.width * BACK_ZONE_RATIO;
  };

  app.querySelector<HTMLElement>('.game-screen')?.addEventListener('click', (event) => {
    // 按鈕（選項、重來、回上一句）各自處理；其他地方點一下就是「下一句」。
    if ((event.target as HTMLElement).closest('button')) return;
    // 打字進行中：點畫面任何地方都是「不等了，直接打完」，包含左側的回溯區——
    // 玩家這時想做的是跳過動畫，不是回上一句。真的要回去還有左下角的箭頭與 ArrowLeft。
    if (activeTyping) {
      activeTyping.finish();
      return;
    }
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
      // 選完就離開選項頁（下一場即使是同一個場景 ID 也該從台詞開始）。
      choiceStepSceneId = undefined;
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
