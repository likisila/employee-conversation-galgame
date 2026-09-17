export type GameValue = string | number | boolean;
export type GameState = Record<string, GameValue>;

export interface Character {
  id: string;
  displayName: string;
  role?: string;
  avatar?: string;
}

export interface SpriteSheet {
  src: string;
  alt: string;
  columns: number;
  /** 單格寬／高。有值時 renderer 依此設定立繪框比例，避免不同尺寸的 sprite sheet 被拉伸。 */
  frameAspectRatio?: number;
  defaultExpression: string;
  expressions: Record<string, number>;
  align?: 'left' | 'right' | 'center';
}

export interface BackgroundImage {
  src: string;
  alt: string;
  focalPoint?: string;
}

export interface TransitionSpec {
  durationMs: number;
  asset?: string;
}

export interface ScenePresentation {
  background?: string;
  character?: string;
  /** `character: null`：這一場不顯示任何立繪（例如背景已是描繪該角色的 CG），也不做說話者 fallback。 */
  hideCharacter?: boolean;
  expression?: string;
  transition?: string;
}

export interface ImageCatalog {
  characters: Record<string, SpriteSheet>;
  backgrounds: Record<string, BackgroundImage>;
  sceneBackgrounds: Record<string, string>;
  screens: Record<string, BackgroundImage>;
  ui: Record<string, string>;
  transitions: Record<string, TransitionSpec>;
  scenePresentation: Record<string, ScenePresentation>;
}

export interface Condition {
  variable: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  value: GameValue;
}

export interface Effect {
  variable: string;
  operation: 'set' | 'add';
  value: GameValue;
}

export interface Choice {
  id: string;
  text: string;
  next: string;
  conditions?: Condition[];
  effects?: Effect[];
}

/**
 * 台詞類型，決定對話框的呈現方式：
 * - `dialogue`：角色說出口的話（顯示名字）
 * - `thought`：內心話（不出聲，淡色＋「內心」標籤）
 * - `narration`：旁白／場景描述（無名字）
 * - `message`：Teams／私訊／頻道等文字訊息（訊息卡片）
 *
 * 資料可明確寫 `kind`；沒寫時依既有寫法推斷：`（內心）` 開頭 → thought、
 * `【頻道·發送者】` 開頭 → message、`speaker: null` → narration，其餘 → dialogue。
 */
export type LineKind = 'dialogue' | 'thought' | 'narration' | 'message';

export interface Line {
  speaker: string | null;
  text: string;
  kind?: LineKind;
  /** message 專用：頻道或訊息類型，例如「私訊」「公司頻道」。 */
  channel?: string;
  /** message 專用：發送者顯示名稱（原文寫法，例如「予安」）。 */
  from?: string;
  /** 只有全部條件成立時才顯示這句；用來呈現「依先前選擇」的分歧台詞。 */
  conditions?: Condition[];
  /**
   * 從這一句開始換背景，直到同場景中下一句指定為止。
   * 用來處理一個場景內的時間／地點跳躍（例如結局的「三週後」）。
   */
  background?: string;
  /**
   * 從這一句開始指定立繪：角色 ID，或 `null` 代表不顯示任何人（角色已離場）。
   * 未指定時沿用「跟著說話者走」的規則。
   */
  character?: string | null;
}

/** 依狀態自動決定下一個場景的路由項；由上到下取第一個條件全部成立者。 */
export interface RouteEntry {
  conditions?: Condition[];
  next: string;
}

export interface Scene {
  id: string;
  title?: string;
  lines: Line[];
  choices: Choice[];
  next?: string;
  ending?: boolean;
  /** 結局／分歧的優先序路由；進入本場景時依序判定並自動前往命中者。 */
  route?: RouteEntry[];
}

export interface Game {
  id: string;
  title: string;
  startScene: string;
  initialState: GameState;
  /** 玩家操作的角色 ID；用來把玩家自己送出的訊息靠右顯示。選填。 */
  player?: string;
}

export interface Manifest {
  game: string;
  characters: string;
  scenes: string[];
  ui?: string;
  images?: string;
}

export interface UiCopy {
  choicePrompt: string;
  continueLabel: string;
  restartLabel: string;
  narratorName: string;
  startLabel: string;
  loadingLabel: string;
  subtitle: string;
  resumeLabel: string;
  newGameLabel: string;
  /** 名牌上標示「這是玩家自己」的小字。 */
  playerLabel: string;
  /** 讀取／轉場畫面等待點擊時的提示。 */
  tapToContinueLabel: string;
  /** 回到上一句的按鈕標籤（螢幕閱讀器用）。 */
  backLabel: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== 'string') throw new Error(`${key} 必須是字串`);
  return value[key];
}

function asGameValue(value: unknown, label: string): GameValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  throw new Error(`${label} 必須是 string / number / boolean`);
}

export function parseManifest(raw: unknown): Manifest {
  if (!isRecord(raw)) throw new Error('manifest 必須是物件');
  if (!Array.isArray(raw.scenes) || !raw.scenes.every((item) => typeof item === 'string')) {
    throw new Error('manifest.scenes 必須是字串陣列');
  }
  return {
    game: stringField(raw, 'game'),
    characters: stringField(raw, 'characters'),
    scenes: raw.scenes,
    ui: typeof raw.ui === 'string' ? raw.ui : undefined,
    images: typeof raw.images === 'string' ? raw.images : undefined,
  };
}

export function parseGame(raw: unknown): Game {
  if (!isRecord(raw) || !isRecord(raw.initialState)) throw new Error('game 格式錯誤');
  const initialState: GameState = {};
  for (const [key, value] of Object.entries(raw.initialState)) initialState[key] = asGameValue(value, `initialState.${key}`);
  return {
    id: stringField(raw, 'id'),
    title: stringField(raw, 'title'),
    startScene: stringField(raw, 'startScene'),
    initialState,
    player: typeof raw.player === 'string' ? raw.player : undefined,
  };
}

export function parseCharacters(raw: unknown): Character[] {
  if (!Array.isArray(raw)) throw new Error('characters 必須是陣列');
  return raw.map((item) => {
    if (!isRecord(item)) throw new Error('character 格式錯誤');
    return {
      id: stringField(item, 'id'),
      displayName: stringField(item, 'displayName'),
      role: typeof item.role === 'string' ? item.role : undefined,
      avatar: typeof item.avatar === 'string' ? item.avatar : undefined,
    };
  });
}

function parseConditions(raw: unknown): Condition[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((condition) => {
    if (!isRecord(condition)) throw new Error('condition 格式錯誤');
    const operator = stringField(condition, 'operator');
    if (!['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(operator)) throw new Error(`未知 operator: ${operator}`);
    return { variable: stringField(condition, 'variable'), operator: operator as Condition['operator'], value: asGameValue(condition.value, 'condition.value') };
  });
}

function parseChoice(raw: unknown): Choice {
  if (!isRecord(raw)) throw new Error('choice 格式錯誤');
  const conditions = parseConditions(raw.conditions);
  const effects: Effect[] | undefined = Array.isArray(raw.effects)
    ? raw.effects.map((effect) => {
        if (!isRecord(effect)) throw new Error('effect 格式錯誤');
        const operation = stringField(effect, 'operation');
        if (operation !== 'set' && operation !== 'add') throw new Error(`未知 operation: ${operation}`);
        return { variable: stringField(effect, 'variable'), operation, value: asGameValue(effect.value, 'effect.value') };
      })
    : undefined;
  return { id: stringField(raw, 'id'), text: stringField(raw, 'text'), next: stringField(raw, 'next'), conditions, effects };
}

const LINE_KINDS: readonly LineKind[] = ['dialogue', 'thought', 'narration', 'message'];
/** `（內心）` 或 `(內心)` 前綴。 */
const THOUGHT_PREFIX = /^[（(]\s*內心\s*[)）]\s*/;
/** `【私訊·林雨澄】`、`【公司頻道·執行長】`；分隔符接受 · ・ • ｜ | ： :。 */
const MESSAGE_PREFIX = /^【([^】·・•｜|：:]+)[·・•｜|：:]([^】]+)】\s*/;

export function parseLine(raw: unknown): Line {
  if (!isRecord(raw)) throw new Error('line 格式錯誤');
  if (raw.speaker !== null && typeof raw.speaker !== 'string') throw new Error('line.speaker 格式錯誤');
  if (raw.kind !== undefined && !LINE_KINDS.includes(raw.kind as LineKind)) throw new Error(`未知 line.kind: ${String(raw.kind)}`);
  if (raw.background !== undefined && typeof raw.background !== 'string') throw new Error('line.background 必須是字串');
  if (raw.character !== undefined && raw.character !== null && typeof raw.character !== 'string') {
    throw new Error('line.character 必須是字串或 null');
  }
  const speaker = raw.speaker as string | null;
  let text = stringField(raw, 'text');
  let kind = raw.kind as LineKind | undefined;
  let channel = typeof raw.channel === 'string' ? raw.channel : undefined;
  let from = typeof raw.from === 'string' ? raw.from : undefined;

  const thought = THOUGHT_PREFIX.exec(text);
  const message = MESSAGE_PREFIX.exec(text);
  if (thought && (kind === undefined || kind === 'thought')) {
    kind = 'thought';
    text = text.slice(thought[0].length);
  } else if (message && (kind === undefined || kind === 'message')) {
    kind = 'message';
    channel ??= message[1].trim();
    from ??= message[2].trim();
    text = text.slice(message[0].length);
  }
  kind ??= speaker === null ? 'narration' : 'dialogue';

  return {
    speaker,
    text,
    kind,
    channel,
    from,
    conditions: parseConditions(raw.conditions),
    background: typeof raw.background === 'string' ? raw.background : undefined,
    // `'character' in raw` 才能區分「沒有指定」與「指定為 null（不顯示立繪）」。
    character: 'character' in raw ? (raw.character as string | null) : undefined,
  };
}

export function parseScene(raw: unknown): Scene {
  if (!isRecord(raw) || !Array.isArray(raw.lines)) throw new Error('scene 格式錯誤');
  const lines = raw.lines.map(parseLine);
  const route: RouteEntry[] | undefined = Array.isArray(raw.route)
    ? raw.route.map((entry) => {
        if (!isRecord(entry)) throw new Error('route 項目格式錯誤');
        return { conditions: parseConditions(entry.conditions), next: stringField(entry, 'next') };
      })
    : undefined;
  return {
    id: stringField(raw, 'id'),
    title: typeof raw.title === 'string' ? raw.title : undefined,
    lines,
    choices: Array.isArray(raw.choices) ? raw.choices.map(parseChoice) : [],
    next: typeof raw.next === 'string' ? raw.next : undefined,
    ending: typeof raw.ending === 'boolean' ? raw.ending : undefined,
    route,
  };
}

export function parseUi(raw: unknown): UiCopy {
  const value = isRecord(raw) ? raw : {};
  return {
    choicePrompt: typeof value.choicePrompt === 'string' ? value.choicePrompt : '請選擇：',
    continueLabel: typeof value.continueLabel === 'string' ? value.continueLabel : '繼續',
    restartLabel: typeof value.restartLabel === 'string' ? value.restartLabel : '重新開始',
    narratorName: typeof value.narratorName === 'string' ? value.narratorName : '旁白',
    startLabel: typeof value.startLabel === 'string' ? value.startLabel : '開始對話',
    loadingLabel: typeof value.loadingLabel === 'string' ? value.loadingLabel : '整理思緒中',
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : '一場需要好好聽完的對話',
    resumeLabel: typeof value.resumeLabel === 'string' ? value.resumeLabel : '繼續上次',
    newGameLabel: typeof value.newGameLabel === 'string' ? value.newGameLabel : '重新開始',
    playerLabel: typeof value.playerLabel === 'string' ? value.playerLabel : '你',
    tapToContinueLabel: typeof value.tapToContinueLabel === 'string' ? value.tapToContinueLabel : '點擊畫面繼續',
    backLabel: typeof value.backLabel === 'string' ? value.backLabel : '回到上一句',
  };
}

function parseBackground(raw: unknown, label: string): BackgroundImage {
  if (!isRecord(raw)) throw new Error(`${label} 格式錯誤`);
  return { src: stringField(raw, 'src'), alt: stringField(raw, 'alt'), focalPoint: typeof raw.focalPoint === 'string' ? raw.focalPoint : undefined };
}

export function parseImages(raw: unknown): ImageCatalog {
  if (!isRecord(raw)) throw new Error('images 必須是物件');
  const characterSource = isRecord(raw.characters) ? raw.characters : {};
  const backgroundSource = isRecord(raw.backgrounds) ? raw.backgrounds : {};
  const screenSource = isRecord(raw.screens) ? raw.screens : {};
  const sceneSource = isRecord(raw.sceneBackgrounds) ? raw.sceneBackgrounds : {};
  const uiSource = isRecord(raw.ui) ? raw.ui : {};
  const transitionSource = isRecord(raw.transitions) ? raw.transitions : {};
  const presentationSource = isRecord(raw.scenePresentation) ? raw.scenePresentation : {};
  const characters: Record<string, SpriteSheet> = {};

  for (const [id, value] of Object.entries(characterSource)) {
    if (!isRecord(value) || !isRecord(value.expressions)) throw new Error(`images.characters.${id} 格式錯誤`);
    const expressions: Record<string, number> = {};
    for (const [name, frame] of Object.entries(value.expressions)) {
      if (typeof frame !== 'number' || frame < 0) throw new Error(`images.characters.${id}.expressions.${name} 必須是非負數`);
      expressions[name] = frame;
    }
    if (typeof value.columns !== 'number' || value.columns < 1) throw new Error(`images.characters.${id}.columns 格式錯誤`);
    const align = value.align === 'left' || value.align === 'right' || value.align === 'center' ? value.align : undefined;
    if (value.frameAspectRatio !== undefined && (typeof value.frameAspectRatio !== 'number' || value.frameAspectRatio <= 0)) {
      throw new Error(`images.characters.${id}.frameAspectRatio 必須是正數`);
    }
    characters[id] = {
      src: stringField(value, 'src'),
      alt: stringField(value, 'alt'),
      columns: value.columns,
      frameAspectRatio: typeof value.frameAspectRatio === 'number' ? value.frameAspectRatio : undefined,
      defaultExpression: stringField(value, 'defaultExpression'),
      expressions,
      align,
    };
  }

  const backgrounds = Object.fromEntries(Object.entries(backgroundSource).map(([id, value]) => [id, parseBackground(value, `images.backgrounds.${id}`)]));
  const screens = Object.fromEntries(Object.entries(screenSource).map(([id, value]) => [id, parseBackground(value, `images.screens.${id}`)]));
  const sceneBackgrounds = Object.fromEntries(Object.entries(sceneSource).map(([id, value]) => {
    if (typeof value !== 'string') throw new Error(`images.sceneBackgrounds.${id} 必須是字串`);
    return [id, value];
  }));
  const ui = Object.fromEntries(Object.entries(uiSource).map(([id, value]) => {
    if (typeof value !== 'string') throw new Error(`images.ui.${id} 必須是字串`);
    return [id, value];
  }));
  const transitions: Record<string, TransitionSpec> = {};
  for (const [id, value] of Object.entries(transitionSource)) {
    if (!isRecord(value) || typeof value.durationMs !== 'number' || value.durationMs < 0) throw new Error(`images.transitions.${id} 格式錯誤`);
    transitions[id] = { durationMs: value.durationMs, asset: typeof value.asset === 'string' ? value.asset : undefined };
  }
  const scenePresentation: Record<string, ScenePresentation> = {};
  for (const [id, value] of Object.entries(presentationSource)) {
    if (!isRecord(value)) throw new Error(`images.scenePresentation.${id} 格式錯誤`);
    scenePresentation[id] = {
      background: typeof value.background === 'string' ? value.background : undefined,
      character: typeof value.character === 'string' ? value.character : undefined,
      hideCharacter: value.character === null ? true : undefined,
      expression: typeof value.expression === 'string' ? value.expression : undefined,
      transition: typeof value.transition === 'string' ? value.transition : undefined,
    };
  }
  return { characters, backgrounds, sceneBackgrounds, screens, ui, transitions, scenePresentation };
}
