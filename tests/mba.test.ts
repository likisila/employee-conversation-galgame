import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';
import { computeDebrief, formatDebriefSummary } from '../src/domain/mba';

/**
 * MBA 最後分析 v3 的驗收（見 property/mba-organizational-debrief.md「八、Claude 實作需求」第 8 點）：
 * 四結局皆可開啟正確的路徑分析；同一路徑產生穩定內容；微選擇不同但主要選擇與結局相同時，
 * debrief 完全相同；畫面與摘要均不包含 v2 分數、等級、雷達或課綱外理論清單；每個結局都有一項
 * 替代做法及代價。
 */

const PATHS: Record<string, string[]> = {
  'ending-true-finale': ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate'],
  'ending-decent': ['invite-clear', 'notice-direct', 'answer-deflect', 'doc-protect', 'keep-credit'],
  'ending-soft-knife': ['invite-clear', 'notice-direct', 'answer-bargain', 'doc-pressure', 'keep-advocate'],
  // doc-private 立即終止談話，跳過 Scene 7 推薦微選擇與 Choice 5，此路徑只有 4 個主要決策點。
  'ending-over-line': ['invite-goodnews', 'notice-performance', 'answer-bargain', 'doc-private'],
};

/** 走一輪主線（可指定微選擇；沒指定就一律選第一個可用選項）。 */
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
    engine.choose(id!);
  }
  return engine;
}

describe('MBA 最後分析 v3：組裝層', () => {
  it('四個結局都能算出分析內容，且都是引擎實際會判到的路徑', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(PATHS)) {
      const engine = play(mainChoices);
      expect(engine.currentScene.id, endingId).toBe(endingId);
      const majorChoiceIds = engine.decisionPoints.map((decision) => decision.choiceId);
      expect(majorChoiceIds).toEqual(mainChoices);
      const result = computeDebrief(content, endingId, majorChoiceIds);
      expect(result, endingId).toBeDefined();
      expect(result!.path).toHaveLength(mainChoices.length);
      expect(result!.authorityMap.length).toBeGreaterThanOrEqual(4);
      expect(result!.managerialJudgment.length).toBeGreaterThan(0);
      expect(result!.decisionRights.length).toBeGreaterThan(0);
      expect(result!.conflictCollaboration.length).toBeGreaterThan(0);
      expect(result!.answer.length).toBeGreaterThan(0);
      expect(result!.alternative.length).toBeGreaterThan(0);
      expect(result!.endingLabel.length).toBeGreaterThan(0);
    }
  });

  it('同一條路徑重複計算得到完全相同的內容（穩定、非隨機）', () => {
    const content = loadContent();
    const choices = PATHS['ending-true-finale']!;
    const first = computeDebrief(content, 'ending-true-finale', choices);
    const second = computeDebrief(content, 'ending-true-finale', choices);
    expect(second).toEqual(first);
  });

  it('感情線微選擇不同，但五個主要選擇相同時，debrief 完全相同', () => {
    const content = loadContent();
    const choices = PATHS['ending-true-finale']!;
    const withoutMicro = computeDebrief(content, 'ending-true-finale', choices);

    const engineA = play(choices, { 's1-final-cut': 'look-detail', 's7-not-in-file': 'recommend-honesty' });
    const engineB = play(choices, { 's1-final-cut': 'look-pause', 's7-not-in-file': 'recommend-witness' });
    const resultA = computeDebrief(content, 'ending-true-finale', engineA.decisionPoints.map((d) => d.choiceId));
    const resultB = computeDebrief(content, 'ending-true-finale', engineB.decisionPoints.map((d) => d.choiceId));
    expect(resultA).toEqual(withoutMicro);
    expect(resultB).toEqual(withoutMicro);
  });

  it('找不到結局內容時回傳 undefined，不拋例外', () => {
    const content = loadContent();
    expect(computeDebrief(content, 'not-a-real-ending', [])).toBeUndefined();
  });

  it('路徑時間線依 choice1…choice5 的固定標籤，逐字引用玩家選過的選項原文', () => {
    const content = loadContent();
    const choices = PATHS['ending-true-finale']!;
    const result = computeDebrief(content, 'ending-true-finale', choices)!;
    expect(result.path).toHaveLength(5);
    expect(result.path.map((step) => step.label)).toEqual([
      '邀請方式',
      '說明裁撤',
      '回答決策是否已定',
      '文件與後續窗口',
      '工作權力尚未結束時如何回應私人問題',
    ]);
    for (const step of result.path) expect(step.choiceText.length).toBeGreaterThan(0);
  });

  it('doc-private 立即終止談話：路徑時間線只有 4 步，不包含 Choice 5', () => {
    const content = loadContent();
    const choices = PATHS['ending-over-line']!;
    const result = computeDebrief(content, 'ending-over-line', choices)!;
    expect(result.path).toHaveLength(4);
    expect(result.path.map((step) => step.label)).toEqual(['邀請方式', '說明裁撤', '回答決策是否已定', '文件與後續窗口']);
  });

  it('權限地圖四個結局共用，不隨玩家路徑改變', () => {
    const content = loadContent();
    const maps = Object.entries(PATHS).map(([endingId, choices]) => computeDebrief(content, endingId, choices)!.authorityMap);
    for (const map of maps.slice(1)) expect(map).toEqual(maps[0]);
  });

  it('主問題、共同結論與結論區的三段文字四個結局共用，不因路徑改變', () => {
    const content = loadContent();
    const results = Object.entries(PATHS).map(([endingId, choices]) => computeDebrief(content, endingId, choices)!);
    for (const result of results) {
      expect(result.mainQuestion).toBe(results[0]!.mainQuestion);
      expect(result.sharedConclusion).toBe(results[0]!.sharedConclusion);
      expect(result.finalConclusionTitle).toBe(results[0]!.finalConclusionTitle);
      expect(result.finalConclusionBody).toBe(results[0]!.finalConclusionBody);
      expect(result.courseLinkSentence).toBe(results[0]!.courseLinkSentence);
      expect(result.analysisLimitation).toBe(results[0]!.analysisLimitation);
    }
  });

  it('每個結局的分析都能區別於其他結局（不是複製同一段文字）', () => {
    const content = loadContent();
    const results = Object.entries(PATHS).map(([endingId, choices]) => computeDebrief(content, endingId, choices)!);
    const fields: Array<keyof (typeof results)[number]> = ['managerialJudgment', 'decisionRights', 'conflictCollaboration', 'answer', 'alternative', 'endingLabel'];
    for (const field of fields) {
      const values = results.map((r) => r[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it('複製摘要包含主問題、權限地圖、五次選擇、綜合分析、替代做法與結論，不包含 v2 分數或等級字樣', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    const summary = formatDebriefSummary(result);
    expect(summary).toContain('《最後一次一對一》案例紀錄｜');
    expect(summary).toContain('主問題');
    expect(summary).toContain(result.mainQuestion);
    expect(summary).toContain('共同結論');
    expect(summary).toContain('權限地圖');
    for (const row of result.authorityMap) expect(summary).toContain(row.role);
    expect(summary).toContain('本次選擇');
    for (const step of result.path) expect(summary).toContain(step.choiceText);
    expect(summary).toContain('管理判斷');
    expect(summary).toContain('決策權如何被使用');
    expect(summary).toContain('衝突與合作');
    expect(summary).toContain('對主問題的回答');
    expect(summary).toContain('另一種做法與代價');
    expect(summary).toContain(result.finalConclusionTitle);
    expect(summary).toContain('分析限制');
    // v2 遺留字樣：不得再出現分數、等級或雷達相關詞彙。
    expect(summary).not.toMatch(/[+-]\d/);
    for (const key of ['"C"', '"I"', '"F"', '"A"', '"S"', '"P"']) expect(summary).not.toContain(key);
    expect(summary).not.toContain('穩定建立');
    expect(summary).not.toContain('部分建立');
    expect(summary).not.toContain('證據矛盾');
    expect(summary).not.toContain('未充分建立');
    expect(summary).not.toContain('明顯受損');
    expect(summary).not.toContain('組織行為概念');
  });

  it('DebriefResult 不再帶有六維分數、等級或理論清單欄位', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    expect(Object.keys(result).sort()).toEqual(
      [
        'endingId',
        'endingTitle',
        'endingLabel',
        'mainQuestion',
        'sharedConclusion',
        'authorityMap',
        'path',
        'managerialJudgment',
        'decisionRights',
        'conflictCollaboration',
        'answer',
        'alternative',
        'finalConclusionTitle',
        'finalConclusionBody',
        'courseLinkSentence',
        'analysisLimitation',
      ].sort(),
    );
  });
});
