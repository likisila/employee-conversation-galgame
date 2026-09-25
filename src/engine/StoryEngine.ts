import type { Choice, GameState, Line, Scene } from '../domain/schema';
import type { LoadedContent } from '../data/contentLoader';
import { applyChoiceEffects, isChoiceAvailable, isLineVisible, resolveRoute } from './rules';

export interface StorySnapshot {
  sceneId: string;
  state: GameState;
  /** 目前場景已讀到第幾句（0 起算）。舊存檔沒有此欄位時視為 0。 */
  lineIndex?: number;
  /** 已看過的過場影片 ID。舊存檔沒有此欄位時視為全都沒看過。 */
  watchedCutscenes?: string[];
  /** 這一輪走過的決策點（依序）。舊存檔沒有此欄位時視為還沒做過選擇。 */
  decisions?: DecisionRecord[];
}

/**
 * 一個已經做過的決策點：玩家停在哪一場的哪一句、按下選項「之前」的狀態，以及選了哪一項。
 * 記的是選擇前的狀態，所以回到這個點就等於把那次選擇連同其後的效果一起收回。
 */
export interface DecisionRecord {
  sceneId: string;
  /** 選擇當下停在該場景的第幾句（0 起算）。 */
  lineIndex: number;
  /** 套用選項效果「之前」的狀態。 */
  state: GameState;
  /** 當時選了哪一個選項。 */
  choiceId: string;
}

/** 兩份狀態是否完全相同（同樣的鍵、同樣的值）。 */
function sameState(left: GameState, right: GameState): boolean {
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => left[key] === right[key]);
}

/** 回溯上限：最多保留這麼多步，避免長流程無限累積快照。 */
const HISTORY_LIMIT = 200;

/**
 * 反推舊存檔路徑時最多走過幾個節點。目前這部作品只有 243 條路徑，這個上限綽綽有餘；
 * 設上限是為了將來內容長大時，讀檔不會因為窮舉而卡住——走不完就當作推不出來。
 */
const REBUILD_NODE_LIMIT = 20000;

export class StoryEngine {
  private sceneId: string;
  private state: GameState;
  private lineIndex = 0;
  /**
   * 可回溯的進度快照（最舊在前）。玩家做出選擇後整串清空，
   * 因為做過選擇的那一頁不允許回去重選；載入存檔與重新開始也從零算起。
   */
  private history: StorySnapshot[] = [];
  /** 已播完或被玩家跳過的過場影片；同一段不重播，回上一句也不會再看到。 */
  private watchedCutscenes = new Set<string>();
  /**
   * 這一輪走過的決策點（最早在前）。與 `history` 不同：`history` 是逐句的回溯紀錄，
   * 做出選擇時就清空；`decisions` 只記選擇，整輪保留，供通關後回到任一決策點重玩。
   */
  private decisions: DecisionRecord[] = [];

  constructor(private readonly content: LoadedContent) {
    this.sceneId = content.game.startScene;
    this.state = { ...content.game.initialState };
    this.settle();
  }

  get currentScene(): Scene {
    const scene = this.content.scenes.get(this.sceneId);
    if (!scene) throw new Error(`場景不存在：${this.sceneId}`);
    return scene;
  }

  get currentState(): Readonly<GameState> {
    return this.state;
  }

  /** 目前場景中，依狀態實際會顯示的台詞（過濾掉條件未成立的分歧台詞）。 */
  get visibleLines(): Line[] {
    return this.currentScene.lines.filter((line) => isLineVisible(line, this.state));
  }

  /** 目前停在場景的第幾句（0 起算）。 */
  get currentLineIndex(): number {
    return this.lineIndex;
  }

  /** 目前應顯示的那一句；場景沒有台詞時為 undefined。 */
  get currentLine(): Line | undefined {
    return this.visibleLines[this.lineIndex];
  }

  /** 這一場的台詞是否已全部讀完（沒有台詞的場景視為已讀完）。 */
  get atLastLine(): boolean {
    return this.lineIndex >= this.visibleLines.length - 1;
  }

  /** 這段過場影片是否已經看過（含玩家主動跳過）。 */
  hasWatchedCutscene(id: string): boolean {
    return this.watchedCutscenes.has(id);
  }

  /** 記下這段過場影片已經看過；播完與跳過都算。 */
  markCutsceneWatched(id: string): void {
    this.watchedCutscenes.add(id);
  }

  /** 是否還有上一句可以回去。 */
  get canGoBack(): boolean {
    return this.history.length > 0;
  }

  /**
   * 這一輪已經做過的決策點（最早在前），供通關後的決策點選單使用。
   * 回傳複本，外部拿到後改不到引擎內部狀態。
   */
  get decisionPoints(): DecisionRecord[] {
    return this.decisions.map((decision) => ({ ...decision, state: { ...decision.state } }));
  }

  get availableChoices(): Choice[] {
    return this.currentScene.choices.filter((choice) => isChoiceAvailable(choice, this.state));
  }

  /**
   * 玩家點一下畫面：還有下一句就前進一句；台詞讀完且場景有 `next` 就進下一場。
   * 停在選項或結局時不動作並回傳 false，由畫面顯示選項／重來按鈕。
   */
  advance(): boolean {
    if (!this.atLastLine) {
      this.remember();
      this.lineIndex += 1;
      return true;
    }
    if (this.currentScene.next) {
      this.continue();
      return true;
    }
    return false;
  }

  /**
   * 回到上一句（跨場景時回到上一場的最後一句）。
   * 沒有可回溯的紀錄時不動作並回傳 false；做過選擇的那一頁不會留在紀錄裡。
   */
  back(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.sceneId = previous.sceneId;
    this.state = { ...previous.state };
    this.lineIndex = previous.lineIndex ?? 0;
    return true;
  }

  choose(choiceId: string): void {
    const choice = this.availableChoices.find((item) => item.id === choiceId);
    if (!choice) throw new Error(`選項不存在或條件未滿足：${choiceId}`);
    // 先記下這個決策點（含選擇前的狀態），通關後才回得來。
    // 感情線微選擇（`minor`）不算決策點：不影響結局，不該擠進「回到決策點」選單。
    if (!choice.minor) {
      this.decisions.push({ sceneId: this.sceneId, lineIndex: this.lineIndex, state: { ...this.state }, choiceId });
    }
    this.state = applyChoiceEffects(choice, this.state);
    // 選擇一旦定案就不能回頭重選，因此連同之前的回溯紀錄一起清掉。
    this.history = [];
    this.goTo(choice.next);
  }

  /**
   * 回到第 `index` 個決策點（`decisionPoints` 的索引）重新選擇：
   * 場景、停在哪一句與狀態都還原成按下那個選項之前，該決策點與其後的決策紀錄一併捨棄。
   * 索引不合法時不動作並回傳 false。
   *
   * 已看過的過場影片不因此重設——回到決策點是續玩同一輪，不是「重新開始」。
   */
  rewindTo(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= this.decisions.length) return false;
    const decision = this.decisions[index];
    if (!this.content.scenes.has(decision.sceneId)) return false;
    this.sceneId = decision.sceneId;
    this.state = { ...decision.state };
    this.decisions = this.decisions.slice(0, index);
    // 跳回去之後不能再往前一句一句退，否則會退進已經被捨棄的那條路。
    this.history = [];
    const max = Math.max(0, this.visibleLines.length - 1);
    this.lineIndex = Math.min(Math.max(0, Math.floor(decision.lineIndex)), max);
    return true;
  }

  continue(): void {
    const next = this.currentScene.next;
    if (!next) return;
    this.remember();
    this.goTo(next);
  }

  restart(): void {
    this.sceneId = this.content.game.startScene;
    this.state = { ...this.content.game.initialState };
    this.lineIndex = 0;
    this.history = [];
    this.decisions = [];
    // 重新開始是重玩，過場影片要能再看一次。
    this.watchedCutscenes.clear();
    this.settle();
  }

  /** 目前進度的可序列化快照，用於存檔。 */
  get snapshot(): StorySnapshot {
    return {
      sceneId: this.sceneId,
      state: { ...this.state },
      lineIndex: this.lineIndex,
      watchedCutscenes: [...this.watchedCutscenes],
      decisions: this.decisionPoints,
    };
  }

  /**
   * 從快照還原進度。若場景不存在（例如內容已改版），拋出錯誤，
   * 由呼叫端決定是否丟棄過期存檔。lineIndex 超出範圍時夾到合法區間。
   */
  restore(snapshot: StorySnapshot): void {
    if (!this.content.scenes.has(snapshot.sceneId)) {
      throw new Error(`存檔指向不存在的場景：${snapshot.sceneId}`);
    }
    this.sceneId = snapshot.sceneId;
    this.state = { ...snapshot.state };
    this.lineIndex = 0;
    // 存檔只記錄停在哪一句，沒有回溯紀錄可還原。
    this.history = [];
    // 重新載入不該重播已經看過的過場。
    this.watchedCutscenes = new Set(Array.isArray(snapshot.watchedCutscenes) ? snapshot.watchedCutscenes : []);
    this.decisions = this.validDecisionPrefix(snapshot.decisions);
    if (this.decisions.length === 0) {
      // 更新前存的檔沒有決策紀錄，接續玩到結局時會看不到「回到決策點」。
      // 這種存檔仍然記著完整狀態，所以從起點反推這一輪走過的路徑；只有唯一解才採用。
      this.decisions = this.rebuildDecisions(snapshot.sceneId, snapshot.state) ?? [];
    }
    this.settle();
    const max = Math.max(0, this.visibleLines.length - 1);
    this.lineIndex = Math.min(Math.max(0, Math.floor(snapshot.lineIndex ?? 0)), max);
  }

  /** 前進前先把目前這一句記進回溯紀錄（只要回得去所需的三個欄位）。 */
  private remember(): void {
    this.history.push({ sceneId: this.sceneId, state: { ...this.state }, lineIndex: this.lineIndex });
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
  }

  /**
   * 反推這一輪走過的決策點：從起始場景窮舉所有選擇組合，找出「停在同一個場景、狀態完全相同」
   * 的路徑。用於沒有決策紀錄的舊存檔（此欄位是後來才加的），讓它們不必重玩就能使用決策點選單。
   *
   * 只有恰好一條路徑對得上才採用。兩條以上代表這個狀態推不出唯一的歷史，寧可不顯示，
   * 也不要列出玩家沒做過的選擇；一條都沒有（例如存檔被改過或內容已改版）同樣不採用。
   */
  private rebuildDecisions(sceneId: string, state: GameState): DecisionRecord[] | undefined {
    let visited = 0;
    let found: DecisionRecord[] | undefined;
    let ambiguous = false;

    const walk = (currentId: string, currentState: GameState, trail: DecisionRecord[]): void => {
      if (ambiguous || visited >= REBUILD_NODE_LIMIT) return;
      visited += 1;
      const settled = this.settledSceneId(currentId, currentState);
      if (settled === undefined) return;
      if (settled === sceneId && sameState(currentState, state)) {
        // 故事是有向無環的，同一條路徑不會再次走到同一個（場景，狀態），所以命中就不必再往下。
        if (found) ambiguous = true;
        else found = trail;
        return;
      }
      const scene = this.content.scenes.get(settled);
      if (!scene) return;
      const choices = scene.choices.filter((choice) => isChoiceAvailable(choice, currentState));
      const majorChoices = choices.filter((choice) => !choice.minor);
      if (majorChoices.length > 0) {
        const lineIndex = Math.max(0, scene.lines.filter((line) => isLineVisible(line, currentState)).length - 1);
        for (const choice of majorChoices) {
          walk(choice.next, applyChoiceEffects(choice, currentState), [
            ...trail,
            { sceneId: settled, lineIndex, state: { ...currentState }, choiceId: choice.id },
          ]);
        }
        return;
      }
      if (choices.length > 0) {
        // 純感情線微選擇：不影響狀態，選哪一項都通向同一段主線，反推路徑時任取一個即可——
        // 不必當成決策點記錄，也不必窮舉三個分支（都不改狀態，多探也不會消除或製造歧義）。
        walk(choices[0].next, applyChoiceEffects(choices[0], currentState), trail);
        return;
      }
      if (scene.next) walk(scene.next, currentState, trail);
    };

    walk(this.content.game.startScene, { ...this.content.game.initialState }, []);
    if (ambiguous || visited >= REBUILD_NODE_LIMIT) return undefined;
    return found;
  }

  /**
   * 純函式版的 route 解析：回傳從 `sceneId` 依狀態自動跳轉後停在的場景。
   * 與 `settle()` 的差別是不改動引擎狀態、遇到壞資料回傳 undefined 而不拋錯——
   * 反推舊存檔是「盡力而為」，不該因為某條分支的資料有問題就讓讀檔失敗。
   */
  private settledSceneId(sceneId: string, state: GameState): string | undefined {
    let current = sceneId;
    for (let hops = 0; hops < 64; hops += 1) {
      const scene = this.content.scenes.get(current);
      if (!scene) return undefined;
      const target = resolveRoute(scene, state);
      if (target === undefined) return current;
      current = target;
    }
    return undefined;
  }

  /**
   * 存檔裡的決策紀錄取「開頭仍然有效」的那一段：決策點是一條有序的路徑，
   * 中間若有一筆對不上內容（改版），後面的紀錄也不再可信，直接截斷而不是挑著留。
   */
  private validDecisionPrefix(decisions: DecisionRecord[] | undefined): DecisionRecord[] {
    if (!Array.isArray(decisions)) return [];
    const valid: DecisionRecord[] = [];
    for (const decision of decisions) {
      if (!this.isDecisionUsable(decision)) break;
      valid.push({ ...decision, state: { ...decision.state } });
    }
    return valid;
  }

  /**
   * 這筆決策紀錄回得去嗎？光是場景與選項 ID 還在並不夠——回到決策點的意思是
   * 「重新站在那個選項頁上」，所以三件事都要成立，任一項不成立就當作對不上內容：
   *
   * 1. 場景與選項還在。
   * 2. 該選項在當時的狀態下仍然可選（選項條件改過的話，回去也選不到它）。
   * 3. 紀錄的句子仍是該場在當時狀態下的最後一句（選項頁）。場景後來加了或刪了台詞，
   *    同一個 index 就不再是選項頁，回去會停在半途。
   */
  private isDecisionUsable(decision: DecisionRecord): boolean {
    const scene = this.content.scenes.get(decision.sceneId);
    if (!scene) return false;
    const choice = scene.choices.find((item) => item.id === decision.choiceId);
    if (!choice || !isChoiceAvailable(choice, decision.state)) return false;
    const visibleCount = scene.lines.filter((line) => isLineVisible(line, decision.state)).length;
    return decision.lineIndex === Math.max(0, visibleCount - 1);
  }

  private goTo(sceneId: string): void {
    if (!this.content.scenes.has(sceneId)) throw new Error(`下一個場景不存在：${sceneId}`);
    this.sceneId = sceneId;
    this.lineIndex = 0;
    this.settle();
  }

  /**
   * 若目前場景是純路由節點（含 route），依優先序自動前往目標場景，
   * 讓玩家永遠停在有內容的場景上。設上限避免資料錯誤造成無限迴圈。
   */
  private settle(): void {
    for (let hops = 0; hops < 64; hops += 1) {
      const target = resolveRoute(this.currentScene, this.state);
      if (target === undefined) return;
      if (!this.content.scenes.has(target)) throw new Error(`route 指向不存在的場景：${target}`);
      this.sceneId = target;
    }
    throw new Error(`route 解析超過上限，可能有循環：${this.sceneId}`);
  }
}
