import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';
import { computeDebrief, formatDebriefSummary } from '../src/domain/mba';

/**
 * property/mba-debrief.md「八、Claude 實作需求」的驗收：四結局皆可開啟分析、同一路徑產生穩定內容、
 * 微選擇不影響 debrief、摘要不包含內部數值。
 */

const PATHS: Record<string, string[]> = {
  'ending-true-finale': ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate'],
  'ending-decent': ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-credit'],
  'ending-soft-knife': ['invite-vague', 'notice-euphemism', 'answer-deflect', 'doc-pressure', 'keep-credit'],
  'ending-over-line': ['invite-goodnews', 'notice-performance', 'answer-bargain', 'doc-private', 'keep-confess'],
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

describe('MBA Organizational Debrief：計算層', () => {
  it('四個結局都能算出分析內容', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(PATHS)) {
      const engine = play(mainChoices);
      expect(engine.currentScene.id, endingId).toBe(endingId);
      const majorChoiceIds = engine.decisionPoints.map((decision) => decision.choiceId);
      expect(majorChoiceIds).toEqual(mainChoices);
      const result = computeDebrief(content, endingId, majorChoiceIds);
      expect(result, endingId).toBeDefined();
      expect(result!.dimensions).toHaveLength(6);
      expect(result!.choiceTexts).toHaveLength(5);
      expect(result!.causalChains.length).toBeGreaterThanOrEqual(1);
      expect(result!.theories.length).toBeGreaterThanOrEqual(3);
      expect(result!.stakeholders.map((s) => s.key)).toEqual(['lin-yucheng', 'zhou-yuan', 'zeng-yalin', 'company']);
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

  it('END 04：員工主體性／心理安全／程序完整最高只顯示「脆弱」', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-over-line', PATHS['ending-over-line']!)!;
    const clamped = ['employee_agency', 'psychological_safety', 'process_integrity'];
    for (const dimension of result.dimensions) {
      if (clamped.includes(dimension.key)) {
        expect(['脆弱', '低'], dimension.key).toContain(dimension.level);
      }
    }
  });

  it('證據句同分時取較晚的選擇（呈現 delayed consequence）', () => {
    const content = loadContent();
    // doc-protect 與 keep-advocate 在 management_credibility 都是 +1；較晚的 keep-advocate 應勝出。
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    const credibility = result.dimensions.find((d) => d.key === 'management_credibility')!;
    expect(credibility.evidence).toBe('提供事實與資源但不索取感謝或聯絡');
  });

  it('複製摘要不包含內部數值（±數字或原始 C/I/F/A/S/P 欄位名）', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    const summary = formatDebriefSummary(result);
    expect(summary).not.toMatch(/[+-]\d/);
    for (const key of ['"C"', '"I"', '"F"', '"A"', '"S"', '"P"']) expect(summary).not.toContain(key);
    expect(summary).toContain('管理路徑');
    expect(summary).toContain('組織狀態');
  });

  it('找不到結局內容時回傳 undefined，不拋例外', () => {
    const content = loadContent();
    expect(computeDebrief(content, 'not-a-real-ending', [])).toBeUndefined();
  });
});
