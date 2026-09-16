import type { Choice, GameState, Line, Scene } from '../domain/schema';
import type { LoadedContent } from '../data/contentLoader';
import { applyChoiceEffects, isChoiceAvailable, isLineVisible, resolveRoute } from './rules';

export interface StorySnapshot {
  sceneId: string;
  state: GameState;
}

export class StoryEngine {
  private sceneId: string;
  private state: GameState;

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

  get availableChoices(): Choice[] {
    return this.currentScene.choices.filter((choice) => isChoiceAvailable(choice, this.state));
  }

  choose(choiceId: string): void {
    const choice = this.availableChoices.find((item) => item.id === choiceId);
    if (!choice) throw new Error(`選項不存在或條件未滿足：${choiceId}`);
    this.state = applyChoiceEffects(choice, this.state);
    this.goTo(choice.next);
  }

  continue(): void {
    const next = this.currentScene.next;
    if (next) this.goTo(next);
  }

  restart(): void {
    this.sceneId = this.content.game.startScene;
    this.state = { ...this.content.game.initialState };
    this.settle();
  }

  /** 目前進度的可序列化快照，用於存檔。 */
  get snapshot(): StorySnapshot {
    return { sceneId: this.sceneId, state: { ...this.state } };
  }

  /**
   * 從快照還原進度。若場景不存在（例如內容已改版），拋出錯誤，
   * 由呼叫端決定是否丟棄過期存檔。
   */
  restore(snapshot: StorySnapshot): void {
    if (!this.content.scenes.has(snapshot.sceneId)) {
      throw new Error(`存檔指向不存在的場景：${snapshot.sceneId}`);
    }
    this.sceneId = snapshot.sceneId;
    this.state = { ...snapshot.state };
    this.settle();
  }

  private goTo(sceneId: string): void {
    if (!this.content.scenes.has(sceneId)) throw new Error(`下一個場景不存在：${sceneId}`);
    this.sceneId = sceneId;
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
