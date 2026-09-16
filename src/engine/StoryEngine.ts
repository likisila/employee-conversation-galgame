import type { Choice, GameState, Scene } from '../domain/schema';
import type { LoadedContent } from '../data/contentLoader';
import { applyChoiceEffects, isChoiceAvailable } from './rules';

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
  }

  get currentScene(): Scene {
    const scene = this.content.scenes.get(this.sceneId);
    if (!scene) throw new Error(`場景不存在：${this.sceneId}`);
    return scene;
  }

  get currentState(): Readonly<GameState> {
    return this.state;
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
  }

  private goTo(sceneId: string): void {
    if (!this.content.scenes.has(sceneId)) throw new Error(`下一個場景不存在：${sceneId}`);
    this.sceneId = sceneId;
  }
}
