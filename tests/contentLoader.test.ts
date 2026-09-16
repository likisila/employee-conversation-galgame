import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';

// 這個測試實際載入 property/ 內容，等同遊戲啟動時 loadContent() 的行為。
// 若內容（manifest / scenes / images）出現會讓執行期崩潰的不一致，這裡就會失敗，
// 避免「build 綠燈但線上黑畫面」再次發生。
describe('loadContent (real property content)', () => {
  it('loads without throwing and exposes the start scene', () => {
    const content = loadContent();
    expect(content.scenes.size).toBeGreaterThan(0);
    expect(content.scenes.has(content.game.startScene)).toBe(true);
  });

  it('every manifest scene, choice target and scene.next resolves', () => {
    const content = loadContent();
    for (const scene of content.scenes.values()) {
      if (scene.next) expect(content.scenes.has(scene.next)).toBe(true);
      for (const choice of scene.choices) {
        expect(content.scenes.has(choice.next)).toBe(true);
      }
    }
  });
});
