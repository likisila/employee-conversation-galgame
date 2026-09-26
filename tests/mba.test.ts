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

  it('證據句方向規則：「低」只從負向選項取證據，不會借用正向選項', () => {
    const content = loadContent();
    // soft-knife 全部選項對 management_credibility 都是 0 或 -1（無正向項），同分取較晚：keep-credit。
    const result = computeDebrief(content, 'ending-soft-knife', PATHS['ending-soft-knife']!)!;
    const credibility = result.dimensions.find((d) => d.key === 'management_credibility')!;
    expect(credibility.level).toBe('低');
    expect(credibility.evidence).toBe('把曾經爭取轉成員工應回報的情感帳');
  });

  it('證據句方向規則：淨零且正負皆有的維度，畫面並列正負兩項證據', () => {
    const content = loadContent();
    // information_quality（I）：invite-clear +2、notice-performance -2、answer-deflect -1、doc-protect +1、keep-credit 0 → 加總 0，正負皆有。
    const majorChoiceIds = ['invite-clear', 'notice-performance', 'answer-deflect', 'doc-protect', 'keep-credit'];
    const result = computeDebrief(content, 'ending-soft-knife', majorChoiceIds)!;
    const info = result.dimensions.find((d) => d.key === 'information_quality')!;
    expect(info.evidence).toContain('正向行為被另一個選擇抵銷');
    expect(info.evidence).toContain('事前說明會議性質、HR 在場與準備方式'); // invite-clear：最強正向
    expect(info.evidence).toContain('把結構性裁撤錯誤歸因到個人表現'); // notice-performance：最強負向
  });

  it('END 04 封頂維度的證據必須引用 doc-private／keep-confess，不得引用 keep-advocate 等正向選擇', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-over-line', PATHS['ending-over-line']!)!;
    const capped = ['employee_agency', 'psychological_safety', 'process_integrity'];
    for (const key of capped) {
      const dimension = result.dimensions.find((d) => d.key === key)!;
      expect(['脆弱', '低'], key).toContain(dimension.level);
      // doc-private 與 keep-confess 皆出現於此路徑，較晚的 keep-confess 應勝出，即使加總數字已經落在「低」。
      expect(dimension.evidence, key).toBe('在資源依賴尚未解除時要求私人回應');
    }
  });

  it('END 04 由 boundary 累計觸發、未選 doc-private／keep-confess 時，封頂維度仍退回負向證據而非正向', () => {
    const content = loadContent();
    // employee_agency：invite-clear +1、notice-direct +1、answer-admit +2、doc-pressure -2、keep-advocate +1 → 加總 3（中），
    // 但本路徑結局仍傳入 ending-over-line（模擬未選旗標選項也可能因其他機制越線的情境），封頂應強制顯示「脆弱」，
    // 且因沒有 doc-private／keep-confess，須退回一般負向證據（doc-pressure），不得顯示查無證據或借用正向選項。
    const majorChoiceIds = ['invite-clear', 'notice-direct', 'answer-admit', 'doc-pressure', 'keep-advocate'];
    const result = computeDebrief(content, 'ending-over-line', majorChoiceIds)!;
    const agency = result.dimensions.find((d) => d.key === 'employee_agency')!;
    expect(agency.level).toBe('脆弱');
    expect(agency.evidence).toBe('以行政效率要求當場完成收訖');
  });

  it('每個結局都有兩套替代策略，各自都有非空的改善與代價', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(PATHS)) {
      const result = computeDebrief(content, endingId, mainChoices)!;
      expect(result.alternatives, endingId).toHaveLength(2);
      for (const alternative of result.alternatives) {
        expect(alternative.improvement.length, endingId).toBeGreaterThan(0);
        expect(alternative.cost.length, endingId).toBeGreaterThan(0);
      }
    }
  });

  it('理論鏡頭的每一項都附白話解釋與本路徑的證據句，不是只有英文名詞', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    expect(result.theories.length).toBeGreaterThanOrEqual(3);
    for (const theory of result.theories) {
      expect(theory.label.length, theory.name).toBeGreaterThan(0);
      expect(theory.explanation.length, theory.name).toBeGreaterThan(0);
      expect(theory.pathEvidence.length, theory.name).toBeGreaterThan(0);
    }
  });

  it('利害關係人的「微光互動／決策層」結果是逐結局撰寫的具體結果，不是整體管理策略摘要', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(PATHS)) {
      const result = computeDebrief(content, endingId, mainChoices)!;
      const company = result.stakeholders.find((s) => s.key === 'company')!;
      const strategy = content.mba.endings[endingId]!.strategy;
      expect(company.outcome, endingId).not.toBe(strategy);
      expect(company.outcome.length, endingId).toBeGreaterThan(0);
    }
  });
});
