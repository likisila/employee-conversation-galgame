import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';
import { computeDebrief, formatDebriefSummary } from '../src/domain/mba';

/**
 * property/mba-debrief.md「八、Claude 實作需求」的驗收：四結局皆可開啟分析、同一路徑產生穩定內容、
 * 微選擇不影響 debrief、摘要不包含內部數值。2026-09-28 起計分邏輯改依
 * property/mba-dramatic-analysis-scoring-v2-20260928.md 重寫（稀疏矩陣、五種顯示等級、
 * 不可抵銷規則、依優先序挑證據且六張卡不共用同一個選項），相關驗收併入本檔。
 */

const PATHS: Record<string, string[]> = {
  'ending-true-finale': ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate'],
  'ending-decent': ['invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-credit'],
  'ending-soft-knife': ['invite-vague', 'notice-euphemism', 'answer-deflect', 'doc-pressure', 'keep-credit'],
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

/**
 * 只給「四個結局都能算出分析內容」這則測試用：驗證某個組合真的會被引擎判給該結局。
 * `PATHS` 的 ending-decent／ending-soft-knife 組合刻意保留舊版效果下的選項 ID 組合
 * （分數為 0／-1 的整齊平手，見下方「低」「淨零」等測試），只當純函式 `computeDebrief`
 * 的輸入，不代表引擎實際會走到那個結局——2026-09-28 效果重新設計後（B 選項不再是弱選項），
 * 這兩組舊組合改走到別的結局，所以另外準備一組「真的會被引擎判到」的組合。
 */
const REACHABLE_PATHS: Record<string, string[]> = {
  ...PATHS,
  'ending-decent': ['invite-clear', 'notice-direct', 'answer-deflect', 'doc-protect', 'keep-credit'],
  'ending-soft-knife': ['invite-clear', 'notice-direct', 'answer-bargain', 'doc-pressure', 'keep-advocate'],
};

describe('MBA Organizational Debrief：計算層', () => {
  it('四個結局都能算出分析內容', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(REACHABLE_PATHS)) {
      const engine = play(mainChoices);
      expect(engine.currentScene.id, endingId).toBe(endingId);
      const majorChoiceIds = engine.decisionPoints.map((decision) => decision.choiceId);
      expect(majorChoiceIds).toEqual(mainChoices);
      const result = computeDebrief(content, endingId, majorChoiceIds);
      expect(result, endingId).toBeDefined();
      expect(result!.dimensions).toHaveLength(6);
      // doc-private 立即終止談話後只有 4 個主要決策點（見上方 PATHS 註解），其餘結局仍是 5 個。
      expect(result!.choiceTexts).toHaveLength(mainChoices.length);
      expect(result!.causalChains.length).toBeGreaterThanOrEqual(1);
      expect(result!.theories).toHaveLength(3);
      expect(result!.overallConsequence).toBe(content.mba.endings[endingId]!.unintendedConsequence);
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

  it('END 04：doc-private 的不可抵銷規則固定顯示「明顯受損」（不論該維度是否找得到證據）', () => {
    // 2026-09-28 依 mba-dramatic-analysis-scoring-v2-20260928.md「四、不可抵銷規則」第 4 條，
    // doc-private 讓感知公平／員工主體性／心理安全／程序完整固定顯示「明顯受損」，不是「最高只能」，
    // 也不再看結局名稱（見同文件第 6 條：END 04 不另外憑結局名稱扣分）。
    const content = loadContent();
    const result = computeDebrief(content, 'ending-over-line', PATHS['ending-over-line']!)!;
    const fixed = ['perceived_fairness', 'employee_agency', 'psychological_safety', 'process_integrity'];
    for (const dimension of result.dimensions) {
      if (fixed.includes(dimension.key)) expect(dimension.level, dimension.key).toBe('明顯受損');
    }
  });

  it('依維度的證據優先順序挑主要證據，不是依分數大小或選擇順序（見「五、證據分配」）', () => {
    // management_credibility 的優先序是 Choice3→Choice1→Choice5→Choice2；這條路徑裡
    // answer-admit（Choice3）、invite-clear（Choice1）、keep-advocate（Choice5）都對這個維度有
    // 正向證據，但 Choice3 優先序最前，即使 keep-advocate 的分數與它相同、又排在陣列後面。
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    const credibility = result.dimensions.find((d) => d.key === 'management_credibility')!;
    expect(credibility.level).toBe('穩定建立');
    expect(credibility.entries).toHaveLength(1);
    expect(credibility.entries[0]!.choiceId).toBe('answer-admit');
    expect(credibility.entries[0]!.analysis).toBe('正面承認決定已定與延遲告知，先回答雨澄問的問題。');
    expect(credibility.entries[0]!.reactionQuote).toBe('好。那我還能決定什麼？');
  });

  it('複製摘要不包含內部數值（±數字或原始 C/I/F/A/S/P 欄位名），並使用正式新標題', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    const summary = formatDebriefSummary(result);
    expect(summary).not.toMatch(/[+-]\d/);
    for (const key of ['"C"', '"I"', '"F"', '"A"', '"S"', '"P"']) expect(summary).not.toContain(key);
    expect(summary).toContain('《最後一次一對一》案例紀錄｜');
    expect(summary).toContain('本次選擇');
    expect(summary).toContain('組織狀態');
    expect(summary).toContain('各方結果');
    expect(summary).toContain('相關的組織行為概念');
    expect(summary).toContain('對應證據：');
    expect(summary).toContain('其他可行做法');
    expect(summary).not.toContain('管理路徑');
    expect(summary).not.toContain('替代策略');
    expect(summary).not.toContain('改善：');
    expect(summary).not.toContain('代價：');
    // 仍保留五個原始選擇，供使用者做課程反思。
    for (const text of result.choiceTexts) expect(summary).toContain(text);
  });

  it('找不到結局內容時回傳 undefined，不拋例外', () => {
    const content = loadContent();
    expect(computeDebrief(content, 'not-a-real-ending', [])).toBeUndefined();
  });

  it('五個 C 選項讓 management_credibility 加總落到「明顯受損」，證據依優先序挑 answer-bargain', () => {
    // 五個 C 選項的 management_credibility 全部是負分；優先序 Choice3→Choice1→Choice5→Choice2，
    // Choice3（answer-bargain）最前，即使 Choice4（doc-private）與 Choice5（keep-confess）
    // 也都是負分且排在陣列更後面（doc-private 甚至不在這個維度的優先序表裡）。
    const content = loadContent();
    const majorChoiceIds = ['invite-goodnews', 'notice-performance', 'answer-bargain', 'doc-private', 'keep-confess'];
    const result = computeDebrief(content, 'ending-soft-knife', majorChoiceIds)!;
    const credibility = result.dimensions.find((d) => d.key === 'management_credibility')!;
    expect(credibility.level).toBe('明顯受損');
    expect(credibility.entries).toHaveLength(1);
    expect(credibility.entries[0]!.choiceId).toBe('answer-bargain');
    expect(credibility.entries[0]!.analysis).toBe('用不存在的轉圜交換配合，雅琳必須揭露沒有任何保留職位方案。');
  });

  it('證據矛盾：淨零且正負皆有的維度，畫面並列一正一負兩張證據（不是合併成一句話）', () => {
    // information_quality：invite-clear +2、notice-performance -2、其餘三選擇這個維度都是 0
    // → 加總 0，正負皆有 → 證據矛盾。優先序 Choice1→Choice2→Choice3→Choice4，
    // 兩者都排在最前面兩位，各自成為正向／負向證據，不需要再比大小或比先後。
    const content = loadContent();
    const majorChoiceIds = ['invite-clear', 'notice-performance', 'answer-admit', 'doc-protect', 'keep-advocate'];
    const result = computeDebrief(content, 'ending-soft-knife', majorChoiceIds)!;
    const info = result.dimensions.find((d) => d.key === 'information_quality')!;
    expect(info.level).toBe('證據矛盾');
    expect(info.entries).toHaveLength(2);
    const byId = Object.fromEntries(info.entries.map((entry) => [entry.choiceId, entry]));
    expect(byId['invite-clear']?.analysis).toBe('先說職務調整、雅琳在場與存檔準備；雨澄能先完成手邊工作。');
    expect(byId['notice-performance']?.analysis).toBe('把結構性裁撤引向個人表現，雅琳必須當場更正，雨澄被迫替自己辯護。');
  });

  it('封頂維度只要有非零證據就一定顯示（不因為證據已被別張卡引用而變成空卡）', () => {
    // 2026-09-28 依 ChatGPT-20260928-2139 取消跨卡排除：doc-private 讓 perceived_fairness／
    // employee_agency／psychological_safety／process_integrity 固定顯示「明顯受損」，且每個
    // 維度都能各自依優先序找到證據，即使同一個選項（doc-private／answer-bargain）因此被不只
    // 一張卡引用，也不會顯示「查無證據」。
    const content = loadContent();
    const result = computeDebrief(content, 'ending-over-line', PATHS['ending-over-line']!)!;
    const byKey = Object.fromEntries(result.dimensions.map((dimension) => [dimension.key, dimension]));
    expect(byKey['perceived_fairness']!.level).toBe('明顯受損');
    expect(byKey['employee_agency']!.level).toBe('明顯受損');
    expect(byKey['psychological_safety']!.level).toBe('明顯受損');
    expect(byKey['process_integrity']!.level).toBe('明顯受損');

    expect(byKey['perceived_fairness']!.entries[0]?.choiceId).toBe('doc-private');
    expect(byKey['employee_agency']!.entries[0]?.choiceId).toBe('answer-bargain');
    expect(byKey['psychological_safety']!.entries[0]?.choiceId).toBe('notice-performance');
    expect(byKey['process_integrity']!.entries[0]?.choiceId).toBe('doc-private');
    for (const key of ['perceived_fairness', 'employee_agency', 'psychological_safety', 'process_integrity']) {
      expect(byKey[key]!.entries, key).toHaveLength(1);
    }
  });

  it('同一個選項可以同時是好幾張卡的證據；目前分析文字是每個選項單一一句，跨卡引用時逐字相同', () => {
    // 2026-09-28 依 ChatGPT-20260928-2139：允許同一個已選行動同時影響好幾個維度（例如
    // doc-protect 同時支持感知公平、員工主體性與程序完整），取消跨卡排除。但 ChatGPT 同時要求
    // 「六張卡不得複製同一句泛用說明……每張卡的分析必須只解釋該維度的影響」——`mba-debrief.json`
    // 目前每個選項只有一句 `evidence`／`reactionQuote`（不是逐維度各一句），所以同一個選項被
    // 多張卡引用時，這句話目前確實逐字重複。這是已知的內容缺口（需要 ChatGPT 提供逐維度分析文字
    // 才能徹底解決），本測試先鎖住「允許同一選項跨卡出現」這個技術行為本身。
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    const byKey = Object.fromEntries(result.dimensions.map((dimension) => [dimension.key, dimension]));
    expect(byKey['perceived_fairness']!.entries[0]?.choiceId).toBe('doc-protect');
    expect(byKey['employee_agency']!.entries[0]?.choiceId).toBe('doc-protect');
    expect(byKey['process_integrity']!.entries[0]?.choiceId).toBe('doc-protect');
    expect(byKey['employee_agency']!.entries[0]?.analysis).toBe(byKey['perceived_fairness']!.entries[0]?.analysis);
  });

  it('answer-bargain 的不可抵銷規則不需要越線結局或 doc-private／keep-confess 也會生效', () => {
    // 「四、不可抵銷規則」第 3 條只看有沒有選 answer-bargain，不管結局是什麼；這裡刻意傳入
    // ending-over-line 純粹是為了呼叫 computeDebrief（純函式，不驗證引擎是否真的走到這裡），
    // 用來證明封頂邏輯是依選項而非結局名稱觸發（見第 6 條）。
    const content = loadContent();
    const majorChoiceIds = ['invite-clear', 'notice-direct', 'answer-bargain', 'doc-protect', 'keep-advocate'];
    const result = computeDebrief(content, 'ending-over-line', majorChoiceIds)!;
    const byKey = Object.fromEntries(result.dimensions.map((dimension) => [dimension.key, dimension]));
    for (const key of ['management_credibility', 'perceived_fairness', 'employee_agency', 'psychological_safety']) {
      expect(byKey[key]!.level, key).toBe('明顯受損');
    }
    expect(byKey['management_credibility']!.entries[0]?.choiceId).toBe('answer-bargain');
  });

  it('每個結局都有兩套替代策略，各自是一段完整文字（不拆成改善／代價）', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(PATHS)) {
      const result = computeDebrief(content, endingId, mainChoices)!;
      expect(result.alternatives, endingId).toHaveLength(2);
      for (const alternative of result.alternatives) {
        expect(alternative.text.length, endingId).toBeGreaterThan(0);
      }
    }
  });

  it('理論鏡頭固定顯示三個，每一項都附白話解釋與本路徑的證據句，不是只有英文名詞', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    expect(result.theories).toHaveLength(3);
    for (const theory of result.theories) {
      expect(theory.label.length, theory.name).toBeGreaterThan(0);
      expect(theory.explanation.length, theory.name).toBeGreaterThan(0);
      expect(theory.pathEvidence.length, theory.name).toBeGreaterThan(0);
    }
  });

  it('理論固定三個，且來自實際選項而非題號整包帶入：doc-pressure 不得帶出 Equity Theory', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-soft-knife', PATHS['ending-soft-knife']!)!;
    expect(result.theories).toHaveLength(3);
    expect(result.theories.some((t) => t.name === 'Equity Theory')).toBe(false);
  });

  it('三個理論在有三個以上不同來源可用時，不讓同一個選項包辦全部三個', () => {
    const content = loadContent();
    for (const [endingId, mainChoices] of Object.entries(PATHS)) {
      const result = computeDebrief(content, endingId, mainChoices)!;
      const evidenceSet = new Set(result.theories.map((t) => t.pathEvidence));
      expect(evidenceSet.size, endingId).toBeGreaterThan(1);
    }
  });

  it('每個理論的證據必須來自真正帶入該理論的選項，不是共用同一決策點的泛用證據', () => {
    const content = loadContent();
    const choices = PATHS['ending-over-line']!;
    const result = computeDebrief(content, 'ending-over-line', choices)!;
    for (const theory of result.theories) {
      // 同一理論可能出現在多個選項的清單裡；只要求證據等於其中某一個真正帶得出它的選項的證據，
      // 不是任意題號（choice1…choice5）的泛用證據。
      const validEvidence = choices
        .filter((id) => (content.mba.choiceTheories[id] ?? []).includes(theory.name))
        .map((id) => content.mba.scores[id]!.evidence);
      expect(validEvidence.length, theory.name).toBeGreaterThan(0);
      expect(validEvidence, theory.name).toContain(theory.pathEvidence);
    }
  });

  it('結局有辨識度較高的理論時優先納入，TRUE END 不強塞固定名單', () => {
    const content = loadContent();
    const overLine = computeDebrief(content, 'ending-over-line', PATHS['ending-over-line']!)!;
    expect(overLine.theories.some((t) => t.name === 'Power-Dependence')).toBe(true);

    const decent = computeDebrief(content, 'ending-decent', PATHS['ending-decent']!)!;
    expect(decent.theories.some((t) => t.name === 'Social Exchange' || t.name === 'Procedural Justice')).toBe(true);
  });

  it('關鍵選擇與後果：每項只有選擇／當下／影響三個欄位，結局後果不重複塞進每一項', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    expect(result.causalChains.length).toBeGreaterThanOrEqual(1);
    for (const step of result.causalChains) {
      expect(step.choiceText.length).toBeGreaterThan(0);
      expect(step.immediate.length).toBeGreaterThan(0);
      expect(step.impact.length).toBeGreaterThan(0);
      expect(step.immediate).not.toContain(result.overallConsequence);
    }
    expect(result.overallConsequence).toBe(content.mba.endings['ending-true-finale']!.unintendedConsequence);
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

  it('未充分建立：五次選擇對這個維度全部是 0 分時，不挑證據，只顯示查無可觀察行動', () => {
    const content = loadContent();
    // perceived_fairness：invite-clear／notice-euphemism／answer-deflect／doc-pressure／keep-credit
    // 這五個選項對這個維度全部是 0（見 mba-debrief.json 的稀疏矩陣），加總 0 且沒有任何非零證據。
    const majorChoiceIds = ['invite-clear', 'notice-euphemism', 'answer-deflect', 'doc-pressure', 'keep-credit'];
    const result = computeDebrief(content, 'ending-soft-knife', majorChoiceIds)!;
    const fairness = result.dimensions.find((d) => d.key === 'perceived_fairness')!;
    expect(fairness.level).toBe('未充分建立');
    expect(fairness.entries).toHaveLength(0);
    expect(fairness.note).toBe('本輪沒有足夠的可觀察行動。');
  });

  it('組織狀態卡不再顯示數字或雷達面積：DebriefDimension 沒有裸露的 C/I/F/A/S/P 分數欄位', () => {
    const content = loadContent();
    const result = computeDebrief(content, 'ending-true-finale', PATHS['ending-true-finale']!)!;
    for (const dimension of result.dimensions) {
      expect(Object.keys(dimension).sort()).toEqual(['entries', 'key', 'label', 'level', 'note'].sort());
    }
  });
});
