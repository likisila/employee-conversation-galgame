export type GameValue = string | number | boolean;
export type GameState = Record<string, GameValue>;

export interface Character {
  id: string;
  displayName: string;
  role?: string;
  avatar?: string;
}

/**
 * 角色立繪。支援兩種素材組織方式，資料寫法由 `expressions` 的值決定：
 *
 * - **sprite sheet**：值是畫格索引（數字），所有表情排在同一張圖裡，`columns` 為格數。
 * - **逐張圖**：值是該表情自己的圖片路徑（字串），適合每個表情各一張的全身透明 PNG。
 *   解析後 `columns` 恆為 1、畫格索引恆為 0，`sources` 帶著表情對應的圖片，
 *   因此 renderer 只要多問一次 `sources`，其餘排版與切換邏輯兩種方式共用。
 */
export interface SpriteSheet {
  /** sheet 模式是整張圖；逐張模式是預設表情那一張（找不到對應表情時的退路）。 */
  src: string;
  alt: string;
  columns: number;
  /** 單格寬／高。有值時 renderer 依此設定立繪框比例，避免不同尺寸的素材被拉伸。 */
  frameAspectRatio?: number;
  defaultExpression: string;
  expressions: Record<string, number>;
  /** 逐張模式：表情 → 圖片路徑。sheet 模式沒有這個欄位。 */
  sources?: Record<string, string>;
  align?: 'left' | 'right' | 'center';
}

/**
 * 立繪在這張背景上的取景方式（規格見 property/VISUALS.md「角色立繪取景規格」）。
 * 原始素材永遠是完整全身圖，取景只在顯示階段處理，不另外裁切或重新編碼素材。
 *
 * - `full`：全身，腳底落在地面視覺區（有地板的寬景）。
 * - `upper-body`：近景只露頭到腰／大腿，下緣由舞台裁掉，不露腳（會議室桌面特寫）。
 * - `none`：不疊立繪（劇情 CG 本身已是敘事主體）。
 */
export type CharacterFraming = 'full' | 'upper-body' | 'none';

export interface BackgroundImage {
  src: string;
  alt: string;
  focalPoint?: string;
  /** 這張背景上的立繪取景；未設定時視為 `full`。 */
  characterFraming?: CharacterFraming;
}

export interface TransitionSpec {
  durationMs: number;
  asset?: string;
}

export interface ScenePresentation {
  background?: string;
  /** 分鏡例外：覆寫背景決定的取景。只有確有需要時才寫。 */
  characterFraming?: CharacterFraming;
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
   * 「打字又刪除」的草稿：依序打進輸入框、停一下、再逐字刪掉，最後才是這句的正式內容。
   *
   * 給私訊這種「在輸入框裡反覆改寫」的段落用。字串本身是既有台詞裡已經寫過的草稿原文
   * （例如 s2「我寫下『方便聊聊嗎』，刪掉」），這裡只是把它標記成可以演出來的一段。
   */
  drafts?: string[];
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
  /** 影片格式與缺檔策略（ChatGPT 維護的內容設定）。 */
  cutscenes?: string;
  /** 過場影片掛在哪個引擎場景之前（Claude 維護的技術對應）。 */
  cutsceneCues?: string;
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
  /**
   * 讀取畫面在素材還沒載完時的說明句。載完之後換成 `tapToContinueLabel`，兩句不會同時出現。
   * 這句原本寫死在 renderer 裡；`ChatGPT-20260920-0833` 定了新文案，改由 `property/ui.json` 提供。
   */
  loadingNote: string;
  /** 回到上一句的按鈕標籤（螢幕閱讀器用）。 */
  backLabel: string;
  /** 過場影片的「跳過」按鈕文字。 */
  skipCutsceneLabel: string;
  /** 過場影片的靜音切換按鈕標籤（螢幕閱讀器用）。 */
  muteCutsceneLabel: string;
  /** 過場影片本身的替代說明（螢幕閱讀器用）。 */
  cutsceneLabel: string;
  /** 通關畫面上開啟「回到決策點」選單的按鈕文字。 */
  rewindLabel: string;
  /** 決策點選單的標題。 */
  rewindPrompt: string;
  /** 決策點選單中，每一項顯示「當時選了哪一項」的前綴。 */
  rewindChoiceLabel: string;
  /** 關閉決策點選單的按鈕文字。 */
  rewindCloseLabel: string;
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
    cutscenes: typeof raw.cutscenes === 'string' ? raw.cutscenes : undefined,
    cutsceneCues: typeof raw.cutsceneCues === 'string' ? raw.cutsceneCues : undefined,
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
  if (raw.drafts !== undefined && (!Array.isArray(raw.drafts) || !raw.drafts.every((draft) => typeof draft === 'string' && draft.length > 0))) {
    throw new Error('line.drafts 必須是非空字串的陣列');
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
    drafts: Array.isArray(raw.drafts) ? (raw.drafts as string[]) : undefined,
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
    loadingNote: typeof value.loadingNote === 'string' ? value.loadingNote : '讀取完成後，點擊畫面繼續。',
    backLabel: typeof value.backLabel === 'string' ? value.backLabel : '回到上一句',
    skipCutsceneLabel: typeof value.skipCutsceneLabel === 'string' ? value.skipCutsceneLabel : '跳過',
    muteCutsceneLabel: typeof value.muteCutsceneLabel === 'string' ? value.muteCutsceneLabel : '靜音',
    cutsceneLabel: typeof value.cutsceneLabel === 'string' ? value.cutsceneLabel : '過場影片',
    rewindLabel: typeof value.rewindLabel === 'string' ? value.rewindLabel : '回到決策點',
    rewindPrompt: typeof value.rewindPrompt === 'string' ? value.rewindPrompt : '回到哪一個決策點？',
    rewindChoiceLabel: typeof value.rewindChoiceLabel === 'string' ? value.rewindChoiceLabel : '你選了：',
    rewindCloseLabel: typeof value.rewindCloseLabel === 'string' ? value.rewindCloseLabel : '關閉',
  };
}

/**
 * 過場影片的播放設定。語意來源是 ChatGPT 維護的 `property/cutscenes.json`；
 * 這裡只取執行端真正會用到的欄位，其餘（Sora prompt、style bible）不進 runtime。
 */
export interface CutsceneSettings {
  /** 缺少 MP4 時的行為。目前只支援 `skip-video-and-enter-canonical-scene`。 */
  missingAssetBehavior: 'skip-video-and-enter-canonical-scene';
}

/** 一段過場影片掛在哪個引擎場景之前。 */
export interface CutsceneCue {
  /** 對應 `property/sora-cutscenes.json` 的 item id。 */
  id: string;
  /** MP4 檔名，需與 sora manifest 的 `file` 一致（由測試把關）。 */
  file: string;
  /** sora manifest 的敘事層 trigger，原樣保留供對照與測試。 */
  trigger: string;
  /** 進入這個引擎場景前播放。 */
  scene: string;
  /** 解析後的影片 URL。 */
  src: string;
  /**
   * 正式 MP4 還沒生成時的 placeholder：依序輪播的分鏡影格。
   * 影片載得到就一律播影片；只有影片缺檔／無法解碼時才輪播這些圖。
   */
  storyboard?: StoryboardFrame[];
}

/** 分鏡輪播的一格。 */
export interface StoryboardFrame {
  /** 鏡號（例如 `00-A`），對應分鏡表與 `keyframes/runway-v2/<鏡號>.png`。 */
  shot: string;
  /** 解析後的交付圖 URL。 */
  src: string;
  /** 這一格停留的秒數，沿用分鏡表的剪輯長度。 */
  seconds: number;
}

export function parseCutsceneSettings(raw: unknown): CutsceneSettings {
  const value = isRecord(raw) ? raw : {};
  // 目前只有一種策略；出現未知值時視為錯誤，避免默默用了非預期行為。
  const behavior = value.missingAssetBehavior;
  if (behavior !== undefined && behavior !== 'skip-video-and-enter-canonical-scene') {
    throw new Error(`cutscenes.missingAssetBehavior 不支援：${String(behavior)}`);
  }
  return { missingAssetBehavior: 'skip-video-and-enter-canonical-scene' };
}

export function parseCutsceneCues(raw: unknown): CutsceneCue[] {
  const value = isRecord(raw) ? raw : {};
  if (!Array.isArray(value.cues)) throw new Error('cutscene-cues.cues 必須是陣列');
  const directory = typeof value.directory === 'string' ? value.directory.replace(/\/$/, '') : '/assets/cutscenes';
  const storyboardDirectory = typeof value.storyboardDirectory === 'string'
    ? value.storyboardDirectory.replace(/\/$/, '')
    : `${directory}/storyboard`;
  const seenIds = new Set<string>();
  const seenScenes = new Set<string>();
  return value.cues.map((item, index) => {
    if (!isRecord(item)) throw new Error(`cutscene-cues.cues[${index}] 格式錯誤`);
    const id = stringField(item, 'id');
    const file = stringField(item, 'file');
    const scene = stringField(item, 'scene');
    if (seenIds.has(id)) throw new Error(`cutscene-cues 有重複的 id：${id}`);
    // 一個場景只掛一段影片，否則進場時該播哪一段是未定義的。
    if (seenScenes.has(scene)) throw new Error(`cutscene-cues 的場景 ${scene} 掛了多段影片`);
    seenIds.add(id);
    seenScenes.add(scene);
    const storyboard = item.storyboard === undefined
      ? undefined
      : parseStoryboard(item.storyboard, storyboardDirectory, `cutscene-cues ${id}.storyboard`);
    return { id, file, scene, trigger: stringField(item, 'trigger'), src: `${directory}/${file}`, storyboard };
  });
}

function parseStoryboard(raw: unknown, directory: string, label: string): StoryboardFrame[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`${label} 必須是非空陣列`);
  return raw.map((frame, index) => {
    if (!isRecord(frame)) throw new Error(`${label}[${index}] 格式錯誤`);
    const shot = stringField(frame, 'shot');
    const seconds = frame.seconds;
    // 0 秒或負數會讓輪播瞬間跳過，太長則像當機；兩種都當成資料錯誤。
    if (typeof seconds !== 'number' || !(seconds > 0 && seconds <= 30)) {
      throw new Error(`${label}[${index}].seconds 必須是 0–30 之間的正數`);
    }
    return { shot, seconds, src: `${directory}/${shot}.webp` };
  });
}

const CHARACTER_FRAMINGS: readonly CharacterFraming[] = ['full', 'upper-body', 'none'];

/** 取景欄位：沒寫就是 undefined（由呼叫端當成 `full`），寫了就必須是已知的值。 */
function parseCharacterFraming(value: unknown, label: string): CharacterFraming | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !CHARACTER_FRAMINGS.includes(value as CharacterFraming)) {
    throw new Error(`${label} 必須是 ${CHARACTER_FRAMINGS.join(' / ')} 之一`);
  }
  return value as CharacterFraming;
}

function parseBackground(raw: unknown, label: string): BackgroundImage {
  if (!isRecord(raw)) throw new Error(`${label} 格式錯誤`);
  return {
    src: stringField(raw, 'src'),
    alt: stringField(raw, 'alt'),
    focalPoint: typeof raw.focalPoint === 'string' ? raw.focalPoint : undefined,
    characterFraming: parseCharacterFraming(raw.characterFraming, `${label}.characterFraming`),
  };
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
    const entries = Object.entries(value.expressions);
    if (entries.length === 0) throw new Error(`images.characters.${id}.expressions 不可為空`);
    // 一個角色只能用一種寫法：全是畫格索引（sheet），或全是圖片路徑（逐張）。
    // 混用會讓「這個表情該讀哪張圖」變成依欄位型別而定的隱藏規則，寧可在載入時就擋下。
    const perFile = entries.every(([, frame]) => typeof frame === 'string');
    if (!perFile && !entries.every(([, frame]) => typeof frame === 'number')) {
      throw new Error(`images.characters.${id}.expressions 不可混用畫格索引與圖片路徑`);
    }
    const align = value.align === 'left' || value.align === 'right' || value.align === 'center' ? value.align : undefined;
    if (value.frameAspectRatio !== undefined && (typeof value.frameAspectRatio !== 'number' || value.frameAspectRatio <= 0)) {
      throw new Error(`images.characters.${id}.frameAspectRatio 必須是正數`);
    }
    const defaultExpression = stringField(value, 'defaultExpression');
    const frameAspectRatio = typeof value.frameAspectRatio === 'number' ? value.frameAspectRatio : undefined;
    const alt = stringField(value, 'alt');

    if (perFile) {
      const sources: Record<string, string> = {};
      const expressions: Record<string, number> = {};
      for (const [name, src] of entries) {
        if (typeof src !== 'string' || src.length === 0) throw new Error(`images.characters.${id}.expressions.${name} 必須是非空字串`);
        sources[name] = src;
        expressions[name] = 0;
      }
      if (!sources[defaultExpression]) {
        throw new Error(`images.characters.${id}.defaultExpression「${defaultExpression}」沒有對應的圖片`);
      }
      characters[id] = {
        // 逐張模式不需要 src，但保留「預設表情那一張」當退路，讓下游不必分兩種情況處理。
        src: sources[defaultExpression],
        alt,
        columns: 1,
        frameAspectRatio,
        defaultExpression,
        expressions,
        sources,
        align,
      };
      continue;
    }

    const expressions: Record<string, number> = {};
    for (const [name, frame] of entries) {
      if (typeof frame !== 'number' || frame < 0) throw new Error(`images.characters.${id}.expressions.${name} 必須是非負數`);
      expressions[name] = frame;
    }
    if (typeof value.columns !== 'number' || value.columns < 1) throw new Error(`images.characters.${id}.columns 格式錯誤`);
    characters[id] = {
      src: stringField(value, 'src'),
      alt,
      columns: value.columns,
      frameAspectRatio,
      defaultExpression,
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
      characterFraming: parseCharacterFraming(value.characterFraming, `images.scenePresentation.${id}.characterFraming`),
      character: typeof value.character === 'string' ? value.character : undefined,
      hideCharacter: value.character === null ? true : undefined,
      expression: typeof value.expression === 'string' ? value.expression : undefined,
      transition: typeof value.transition === 'string' ? value.transition : undefined,
    };
  }
  return { characters, backgrounds, sceneBackgrounds, screens, ui, transitions, scenePresentation };
}
