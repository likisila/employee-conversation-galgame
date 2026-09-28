import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';

/**
 * 走完全劇每一條選擇組合，確認結局判定符合企劃定案：
 * 「私下補錢」與「權力關係仍在時告白」是不可被後續加分抵銷的重大越線，一律鎖 END 04；
 * 其他界線分數維持累計制。同時當作全內容的煙霧測試（沒有斷頭場景、沒有到不了的選項）。
 */
function walkAllPaths(): Array<{ path: string[]; ending: string; state: Record<string, unknown> }> {
  const content = loadContent();
  const results: Array<{ path: string[]; ending: string; state: Record<string, unknown> }> = [];

  const walk = (engine: StoryEngine, taken: string[]): void => {
    for (let guard = 0; guard < 200; guard += 1) {
      const scene = engine.currentScene;
      const choices = engine.availableChoices;
      // 五個主要選擇才展開分支、記進路徑；感情線微選擇（`minor`）不影響狀態或結局，
      // 任取一項往下走即可，否則 3^5 的枚舉會被微選擇再乘上好幾倍。
      const majorChoices = choices.filter((choice) => !choice.minor);
      if (majorChoices.length > 0) {
        for (const choice of majorChoices) {
          const branch = new StoryEngine(content);
          branch.restore({ sceneId: scene.id, state: { ...engine.currentState }, lineIndex: 0 });
          branch.choose(choice.id);
          walk(branch, [...taken, choice.id]);
        }
        return;
      }
      if (choices.length > 0) {
        engine.choose(choices[0].id);
        continue;
      }
      if (scene.ending) {
        results.push({ path: taken, ending: scene.id, state: { ...engine.currentState } });
        return;
      }
      expect(scene.next, `場景 ${scene.id} 沒有出口`).toBeDefined();
      engine.continue();
    }
    throw new Error('路徑解析超過上限');
  };

  walk(new StoryEngine(content), []);
  return results;
}

describe('結局路由（全路徑枚舉）', () => {
  const paths = walkAllPaths();

  // doc-private 立即終止談話，跳過 Scene 7 推薦微選擇與 Choice 5
  // （見 property/choice-and-route-revision-20260928.md「doc-private 立即終止」），
  // 所以只有 choice1×choice2×choice3 = 27 條路徑在 choice4=private 之後只有 4 個決策點；
  // 其餘 2/3（choice4=protect／pressure）仍會走到 choice5，維持原本的 5 個決策點。
  // 總數：27 條（4 個決策點）＋ 27×2×3 = 162 條（5 個決策點）＝ 189 條。
  it('每條路徑都走到結局；choice4=private 只有 4 個決策點，其餘都是 5 個，且每個節點都有三個選項', () => {
    expect(paths).toHaveLength(189);
    for (const path of paths) {
      const skippedChoice5 = path.path.includes('doc-private');
      expect(path.path).toHaveLength(skippedChoice5 ? 4 : 5);
    }
  });

  it('四個結局都到得了', () => {
    const endings = new Set(paths.map((path) => path.ending));
    // TRUE END 的實際結尾場景是 ending-true-finale：ending-true 本身多了感情線微選擇，
    // 不再是 `ending: true` 的那個場景（見 property/romance-microchoices.md 微選擇四）。
    expect([...endings].sort()).toEqual(['ending-decent', 'ending-over-line', 'ending-soft-knife', 'ending-true-finale']);
  });

  it('私下補錢或告白一律鎖 END 04，不被後續界線加分抵銷', () => {
    for (const path of paths) {
      const crossed = path.path.includes('doc-private') || path.path.includes('keep-confess');
      if (crossed) expect(path.ending, path.path.join('>')).toBe('ending-over-line');
    }
  });

  it('沒有越線時，END 04 只由累計界線分數觸發', () => {
    for (const path of paths) {
      if (path.ending !== 'ending-over-line') continue;
      const crossed = path.path.includes('doc-private') || path.path.includes('keep-confess');
      if (!crossed) expect(Number(path.state.boundary), path.path.join('>')).toBeLessThanOrEqual(-2);
    }
  });

  it('TRUE END 仍維持高門檻：坦誠、程序、界線都要到位且幾乎沒有逃避', () => {
    const trueEnds = paths.filter((path) => path.ending === 'ending-true-finale');
    expect(trueEnds.length).toBeGreaterThan(0);
    for (const path of trueEnds) {
      expect(Number(path.state.trust)).toBeGreaterThanOrEqual(6);
      expect(Number(path.state.procedure)).toBeGreaterThanOrEqual(4);
      expect(Number(path.state.boundary)).toBeGreaterThanOrEqual(2);
      expect(Number(path.state.avoidance)).toBeLessThanOrEqual(1);
    }
  });
});
