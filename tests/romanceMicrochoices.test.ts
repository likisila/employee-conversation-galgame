import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';

/**
 * 四組感情線微選擇（property/romance-microchoices.md）的整合驗收：
 * 不改動 trust/procedure/boundary/avoidance 或 choice1…choice5，不影響結局，
 * 也不能擠進「回到決策點」選單——那裡只該看到五個主要選擇。
 */

const MAIN_PATH_TRUE_END = ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate'];

/** 三個前段微選擇群組的場景 ID 與選項 ID。 */
const EARLY_MICRO_GROUPS: Record<string, string[]> = {
  's1-final-cut': ['look-work', 'look-detail', 'look-pause'],
  's5-when-did-you-know': ['memory-food', 'memory-coffee', 'memory-unsaid'],
  's7-not-in-file': ['recommend-precision', 'recommend-witness', 'recommend-honesty'],
};

/** TRUE END 判定後才出現的第四組。 */
const TRUE_END_MICRO_SCENE = 'ending-true';
const TRUE_END_MICRO_OPTIONS = ['question-place', 'question-weeks', 'question-unasked'];

/**
 * 依主要選擇（依序）與各微選擇場景要選的選項 ID（沒指定時選第一個）走一輪。
 */
function play(mainChoices: string[], microPicks: Record<string, string> = {}): StoryEngine {
  const engine = new StoryEngine(loadContent());
  let mainIndex = 0;
  for (let guard = 0; guard < 64 && !engine.currentScene.ending; guard += 1) {
    const available = engine.availableChoices;
    if (available.length === 0) {
      engine.continue();
      continue;
    }
    if (available.every((choice) => choice.minor)) {
      const wanted = microPicks[engine.currentScene.id];
      const choice = (wanted && available.find((item) => item.id === wanted)) ?? available[0];
      engine.choose(choice.id);
      continue;
    }
    const id = mainChoices[mainIndex];
    mainIndex += 1;
    expect(available.map((choice) => choice.id), `場景 ${engine.currentScene.id} 沒有選項 ${id}`).toContain(id);
    engine.choose(id!);
  }
  return engine;
}

describe('感情線微選擇：不影響結局與主要決策', () => {
  it('四組選項都能完整顯示，且每一項都不帶 effects（不改動任何狀態）', () => {
    const content = loadContent();
    for (const [sceneId, optionIds] of Object.entries(EARLY_MICRO_GROUPS)) {
      const scene = content.scenes.get(sceneId)!;
      expect(scene.choices.map((choice) => choice.id).sort()).toEqual([...optionIds].sort());
      for (const choice of scene.choices) {
        expect(choice.minor, `${sceneId}.${choice.id} 應標記 minor`).toBe(true);
        expect(choice.effects ?? [], `${sceneId}.${choice.id} 不該有 effects`).toHaveLength(0);
        expect(choice.conditions ?? [], `${sceneId}.${choice.id} 不該有 conditions`).toHaveLength(0);
      }
    }
    const trueEndScene = content.scenes.get(TRUE_END_MICRO_SCENE)!;
    expect(trueEndScene.choices.map((choice) => choice.id).sort()).toEqual([...TRUE_END_MICRO_OPTIONS].sort());
    for (const choice of trueEndScene.choices) {
      expect(choice.minor).toBe(true);
      expect(choice.effects ?? []).toHaveLength(0);
    }
  });

  it('三個分支都在同一段主線匯流，接回既有下一步', () => {
    const content = loadContent();
    expect(content.scenes.get('s1-look-work')!.next).toBe('s1-look-converge');
    expect(content.scenes.get('s1-look-detail')!.next).toBe('s1-look-converge');
    expect(content.scenes.get('s1-look-pause')!.next).toBe('s1-look-converge');
    expect(content.scenes.get('s1-look-converge')!.next).toBe('s2-invite');

    expect(content.scenes.get('s5-memory-food')!.next).toBe('s5-memory-converge');
    expect(content.scenes.get('s5-memory-coffee')!.next).toBe('s5-memory-converge');
    expect(content.scenes.get('s5-memory-unsaid')!.next).toBe('s5-memory-converge');
    expect(content.scenes.get('s5-memory-converge')!.next).toBe('s6-receipt');

    expect(content.scenes.get('s7-recommend-precision')!.next).toBe('s7-recommend-converge');
    expect(content.scenes.get('s7-recommend-witness')!.next).toBe('s7-recommend-converge');
    expect(content.scenes.get('s7-recommend-honesty')!.next).toBe('s7-recommend-converge');
    // s7 的匯流場景本身就是原本第五個主要選擇（keep-advocate／credit／confess），未被移動或改寫。
    expect(content.scenes.get('s7-recommend-converge')!.choices.map((choice) => choice.id).sort())
      .toEqual(['keep-advocate', 'keep-confess', 'keep-credit']);

    expect(content.scenes.get('ending-true-question-place')!.next).toBe('ending-true-finale');
    expect(content.scenes.get('ending-true-question-weeks')!.next).toBe('ending-true-finale');
    expect(content.scenes.get('ending-true-question-unasked')!.next).toBe('ending-true-finale');
    expect(content.scenes.get('ending-true-finale')!.ending).toBe(true);
  });

  it('第四組只掛在 TRUE END：其餘三個結局場景沒有感情線選項', () => {
    const content = loadContent();
    for (const id of ['ending-over-line', 'ending-decent', 'ending-soft-knife']) {
      expect(content.scenes.get(id)!.choices).toHaveLength(0);
    }
  });

  it('任選前三組微選擇的任何組合，五個主要選擇相同時結局與狀態完全相同', () => {
    const combos: Array<Record<string, string>> = [];
    for (const a of EARLY_MICRO_GROUPS['s1-final-cut']!) {
      for (const b of EARLY_MICRO_GROUPS['s5-when-did-you-know']!) {
        for (const c of EARLY_MICRO_GROUPS['s7-not-in-file']!) {
          combos.push({ 's1-final-cut': a, 's5-when-did-you-know': b, 's7-not-in-file': c });
        }
      }
    }
    expect(combos).toHaveLength(27);

    const baseline = play(MAIN_PATH_TRUE_END, combos[0]!);
    const baselineState = { ...baseline.currentState };
    expect(baseline.currentScene.id).toBe('ending-true-finale');

    for (const combo of combos) {
      const engine = play(MAIN_PATH_TRUE_END, combo);
      expect(engine.currentScene.id, JSON.stringify(combo)).toBe('ending-true-finale');
      expect(engine.currentState, JSON.stringify(combo)).toEqual(baselineState);
    }
  });

  it('第四組（TRUE END 後）任一選項都不改變結局場景或狀態，也不能回頭改寫結局', () => {
    const results = TRUE_END_MICRO_OPTIONS.map((option) =>
      play(MAIN_PATH_TRUE_END, { [TRUE_END_MICRO_SCENE]: option }),
    );
    for (const engine of results) {
      expect(engine.currentScene.id).toBe('ending-true-finale');
      expect(engine.currentScene.ending).toBe(true);
    }
    const [first, ...rest] = results;
    for (const engine of rest) expect(engine.currentState).toEqual(first!.currentState);
  });

  it('微選擇不會擠進「回到決策點」選單：走完全程仍然只有五個決策點，依序對應五個主要選擇', () => {
    const engine = play(MAIN_PATH_TRUE_END, {
      's1-final-cut': 'look-detail',
      's5-when-did-you-know': 'memory-coffee',
      's7-not-in-file': 'recommend-honesty',
      [TRUE_END_MICRO_SCENE]: 'question-weeks',
    });
    expect(engine.decisionPoints.map((decision) => decision.choiceId)).toEqual(MAIN_PATH_TRUE_END);
    // 每個決策點的座落場景也都還是五個主要選擇原本所在的場景，不是任何一個微選擇場景。
    const microSceneIds = new Set([...Object.keys(EARLY_MICRO_GROUPS), TRUE_END_MICRO_SCENE]);
    for (const decision of engine.decisionPoints) expect(microSceneIds.has(decision.sceneId)).toBe(false);
  });

  it('回到「你有沒有哪一刻，是真的想把我留下來？」決策點仍然正常運作（微選擇不擋路）', () => {
    const engine = play(MAIN_PATH_TRUE_END, { 's7-not-in-file': 'recommend-witness' });
    expect(engine.rewindTo(4)).toBe(true); // 第五個決策點（index 4）＝ s7-recommend-converge 的三個主要選項
    expect(engine.currentScene.id).toBe('s7-recommend-converge');
    expect(engine.availableChoices.map((choice) => choice.id).sort()).toEqual(['keep-advocate', 'keep-confess', 'keep-credit']);
  });
});
