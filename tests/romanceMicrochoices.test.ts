import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';

/**
 * 四組感情線微選擇（property/narrative-integration-revision-20260926.md）的整合驗收：
 * 不改動 trust/procedure/boundary/avoidance 或 choice1…choice5，不影響結局，
 * 也不能擠進「回到決策點」選單——那裡只該看到五個主要選擇。
 *
 * Scene 1／Scene 7 的微選擇會各自寫入一個敘事記憶變數（s1Memory／s7Memory），
 * 只用來讓 Scene 5／TRUE END 自動路由到對應的回聲場景，不進決策點、不影響結局。
 */

const MAIN_PATH_TRUE_END = ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate'];
const CORE_STATE_KEYS = ['trust', 'procedure', 'boundary', 'avoidance', 'choice1', 'choice2', 'choice3', 'choice4', 'choice5'];

/** 三個前段微選擇群組的場景 ID 與選項 ID。 */
const EARLY_MICRO_GROUPS: Record<string, string[]> = {
  's1-final-cut': ['look-work', 'look-detail', 'look-pause'],
  's5-echo-work': ['reason-hope', 'reason-decide', 'reason-afraid'],
  's7-not-in-file': ['recommend-precision', 'recommend-witness', 'recommend-honesty'],
};

/** TRUE END 判定後才出現的第四組。 */
const TRUE_END_MICRO_SCENE = 'ending-true-recommend-converge';
const TRUE_END_MICRO_OPTIONS = ['question-place', 'question-weeks', 'question-unasked'];

/**
 * 依主要選擇（依序）與各微選擇場景要選的選項 ID（沒指定時選第一個）走一輪。
 * s5 的三個回聲分支（s5-echo-work／detail／pause）由 s1Memory 自動路由，
 * 因此「選 s1 的哪一項」同時決定了會走到哪一個 s5-echo-* 場景；microPicks 用場景 ID 對應即可，
 * 不論實際落在哪一個回聲分支，都用同一把 key（s5-echo-work）指定「為什麼沒說」要選哪一項。
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
      const sceneKey = engine.currentScene.id.startsWith('s5-echo-') ? 's5-echo-work' : engine.currentScene.id;
      const wanted = microPicks[sceneKey];
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
  it('四組選項都能完整顯示，且只有 s1／s7 帶著敘事記憶效果（不動核心狀態）', () => {
    const content = loadContent();
    for (const [sceneId, optionIds] of Object.entries(EARLY_MICRO_GROUPS)) {
      const scene = content.scenes.get(sceneId)!;
      expect(scene.choices.map((choice) => choice.id).sort()).toEqual([...optionIds].sort());
      for (const choice of scene.choices) {
        expect(choice.minor, `${sceneId}.${choice.id} 應標記 minor`).toBe(true);
        expect(choice.conditions ?? [], `${sceneId}.${choice.id} 不該有 conditions`).toHaveLength(0);
        for (const effect of choice.effects ?? []) {
          expect(CORE_STATE_KEYS, `${sceneId}.${choice.id} 不該動到核心狀態 ${effect.variable}`).not.toContain(effect.variable);
        }
      }
    }
    // s1／s7 各自把選了哪一項寫進敘事記憶，供 s5／TRUE END 自動路由。
    const s1 = content.scenes.get('s1-final-cut')!;
    for (const choice of s1.choices) {
      expect(choice.effects).toEqual([{ variable: 's1Memory', operation: 'set', value: choice.id }]);
    }
    const s7 = content.scenes.get('s7-not-in-file')!;
    for (const choice of s7.choices) {
      expect(choice.effects).toEqual([{ variable: 's7Memory', operation: 'set', value: choice.id }]);
    }
    // s5 的「為什麼沒說」選項沒有下游回聲，維持完全不帶 effects。
    for (const sceneId of ['s5-echo-work', 's5-echo-detail', 's5-echo-pause']) {
      for (const choice of content.scenes.get(sceneId)!.choices) {
        expect(choice.effects ?? [], `${sceneId}.${choice.id} 不該有 effects`).toHaveLength(0);
      }
    }

    const trueEndScene = content.scenes.get(TRUE_END_MICRO_SCENE)!;
    expect(trueEndScene.choices.map((choice) => choice.id).sort()).toEqual([...TRUE_END_MICRO_OPTIONS].sort());
    for (const choice of trueEndScene.choices) {
      expect(choice.minor).toBe(true);
      expect(choice.effects ?? []).toHaveLength(0);
    }
  });

  it('Scene 1 的三個選項各自路由到對應的 Scene 5 回聲分支', () => {
    const content = loadContent();
    expect(content.scenes.get('s1-look-work')!.next).toBe('s1-look-converge');
    expect(content.scenes.get('s1-look-detail')!.next).toBe('s1-look-converge');
    expect(content.scenes.get('s1-look-pause')!.next).toBe('s1-look-converge');
    expect(content.scenes.get('s1-look-converge')!.next).toBe('s2-invite');

    expect(content.scenes.get('s5-when-did-you-know')!.next).toBe('s5-echo-router');
    const router = content.scenes.get('s5-echo-router')!;
    expect(router.route).toEqual([
      { conditions: [{ variable: 's1Memory', operator: 'eq', value: 'look-work' }], next: 's5-echo-work' },
      { conditions: [{ variable: 's1Memory', operator: 'eq', value: 'look-detail' }], next: 's5-echo-detail' },
      { next: 's5-echo-pause' },
    ]);
    for (const branch of ['s5-echo-work', 's5-echo-detail', 's5-echo-pause']) {
      expect(content.scenes.get(branch)!.choices.map((choice) => choice.next).sort()).toEqual([
        's5-reason-afraid',
        's5-reason-decide',
        's5-reason-hope',
      ]);
    }
    for (const reason of ['s5-reason-hope', 's5-reason-decide', 's5-reason-afraid']) {
      expect(content.scenes.get(reason)!.next).toBe('s5-reason-converge');
    }
    expect(content.scenes.get('s5-reason-converge')!.next).toBe('s6-receipt');

    expect(content.scenes.get('s7-recommend-precision')!.next).toBe('s7-recommend-converge');
    expect(content.scenes.get('s7-recommend-witness')!.next).toBe('s7-recommend-converge');
    expect(content.scenes.get('s7-recommend-honesty')!.next).toBe('s7-recommend-converge');
    // s7 的匯流場景本身就是原本第五個主要選擇（keep-advocate／credit／confess），未被移動或改寫。
    expect(content.scenes.get('s7-recommend-converge')!.choices.map((choice) => choice.id).sort())
      .toEqual(['keep-advocate', 'keep-confess', 'keep-credit']);

    expect(content.scenes.get('ending-true')!.next).toBe('ending-true-recommend-router');
    const endingRouter = content.scenes.get('ending-true-recommend-router')!;
    expect(endingRouter.route).toEqual([
      { conditions: [{ variable: 's7Memory', operator: 'eq', value: 'recommend-precision' }], next: 'ending-true-recommend-precision' },
      { conditions: [{ variable: 's7Memory', operator: 'eq', value: 'recommend-witness' }], next: 'ending-true-recommend-witness' },
      { next: 'ending-true-recommend-honesty' },
    ]);
    for (const recommend of ['ending-true-recommend-precision', 'ending-true-recommend-witness', 'ending-true-recommend-honesty']) {
      expect(content.scenes.get(recommend)!.next).toBe('ending-true-recommend-converge');
    }
    expect(content.scenes.get('ending-true-recommend-converge')!.choices.map((choice) => choice.id).sort())
      .toEqual([...TRUE_END_MICRO_OPTIONS].sort());

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

  it('Scene 1 選了哪一項，就會自動走到對應的 Scene 5 回聲分支（不是玩家在 Scene 5 選的）', () => {
    for (const [s1Choice, expectedScene] of [
      ['look-work', 's5-echo-work'],
      ['look-detail', 's5-echo-detail'],
      ['look-pause', 's5-echo-pause'],
    ] as const) {
      const engine = play(MAIN_PATH_TRUE_END, { 's1-final-cut': s1Choice });
      // play() 直接跑到底，改用手動步進確認中途真的停在正確的回聲分支。
      const manual = new StoryEngine(loadContent());
      manual.continue(); // content-warning → s1-final-cut
      manual.choose(s1Choice);
      manual.continue(); // s1-look-* → s1-look-converge
      manual.continue(); // s1-look-converge → s2-invite
      manual.choose('invite-clear');
      manual.choose('notice-direct');
      manual.choose('answer-admit');
      manual.continue(); // s5-when-did-you-know → s5-echo-router（自動 route 到對應分支）
      expect(manual.currentScene.id).toBe(expectedScene);
      expect(engine.currentScene.id).toBe('ending-true-finale');
    }
  });

  it('任選前三組微選擇的任何組合，五個主要選擇相同時結局與狀態核心欄位完全相同', () => {
    const combos: Array<Record<string, string>> = [];
    for (const a of EARLY_MICRO_GROUPS['s1-final-cut']!) {
      for (const b of EARLY_MICRO_GROUPS['s5-echo-work']!) {
        for (const c of EARLY_MICRO_GROUPS['s7-not-in-file']!) {
          combos.push({ 's1-final-cut': a, 's5-echo-work': b, 's7-not-in-file': c });
        }
      }
    }
    expect(combos).toHaveLength(27);

    const baseline = play(MAIN_PATH_TRUE_END, combos[0]!);
    const baselineCore = Object.fromEntries(CORE_STATE_KEYS.map((key) => [key, baseline.currentState[key]]));
    expect(baseline.currentScene.id).toBe('ending-true-finale');

    for (const combo of combos) {
      const engine = play(MAIN_PATH_TRUE_END, combo);
      expect(engine.currentScene.id, JSON.stringify(combo)).toBe('ending-true-finale');
      const core = Object.fromEntries(CORE_STATE_KEYS.map((key) => [key, engine.currentState[key]]));
      expect(core, JSON.stringify(combo)).toEqual(baselineCore);
    }
  });

  it('第四組（TRUE END 後）任一選項都不改變結局場景或核心狀態，也不能回頭改寫結局', () => {
    const results = TRUE_END_MICRO_OPTIONS.map((option) =>
      play(MAIN_PATH_TRUE_END, { [TRUE_END_MICRO_SCENE]: option }),
    );
    for (const engine of results) {
      expect(engine.currentScene.id).toBe('ending-true-finale');
      expect(engine.currentScene.ending).toBe(true);
    }
    const [first, ...rest] = results;
    const firstCore = Object.fromEntries(CORE_STATE_KEYS.map((key) => [key, first!.currentState[key]]));
    for (const engine of rest) {
      const core = Object.fromEntries(CORE_STATE_KEYS.map((key) => [key, engine.currentState[key]]));
      expect(core).toEqual(firstCore);
    }
  });

  it('微選擇不會擠進「回到決策點」選單：走完全程仍然只有五個決策點，依序對應五個主要選擇', () => {
    const engine = play(MAIN_PATH_TRUE_END, {
      's1-final-cut': 'look-detail',
      's5-echo-work': 'reason-decide',
      's7-not-in-file': 'recommend-honesty',
      [TRUE_END_MICRO_SCENE]: 'question-weeks',
    });
    expect(engine.decisionPoints.map((decision) => decision.choiceId)).toEqual(MAIN_PATH_TRUE_END);
    // 每個決策點的座落場景也都還是五個主要選擇原本所在的場景，不是任何一個微選擇場景。
    const microSceneIds = new Set([
      ...Object.keys(EARLY_MICRO_GROUPS),
      's5-echo-detail', 's5-echo-pause', 's5-reason-hope', 's5-reason-decide', 's5-reason-afraid',
      TRUE_END_MICRO_SCENE,
    ]);
    for (const decision of engine.decisionPoints) expect(microSceneIds.has(decision.sceneId)).toBe(false);
  });

  it('回到「你有沒有哪一刻，是真的想把我留下來？」決策點仍然正常運作（微選擇不擋路）', () => {
    const engine = play(MAIN_PATH_TRUE_END, { 's7-not-in-file': 'recommend-witness' });
    expect(engine.rewindTo(4)).toBe(true); // 第五個決策點（index 4）＝ s7-recommend-converge 的三個主要選項
    expect(engine.currentScene.id).toBe('s7-recommend-converge');
    expect(engine.availableChoices.map((choice) => choice.id).sort()).toEqual(['keep-advocate', 'keep-confess', 'keep-credit']);
  });
});
