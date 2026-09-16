import type { Choice, GameState, Scene } from '../domain/schema';
import type { LoadedContent } from '../data/contentLoader';
import { applyChoiceEffects, isChoiceAvailable } from './rules';

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

  private goTo(sceneId: string): void {
    if (!this.content.scenes.has(sceneId)) throw new Error(`下一個場景不存在：${sceneId}`);
    this.sceneId = sceneId;
  }
}
