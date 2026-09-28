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
    expect(credibility.evidence).toBe('說明自己做過什麼，也把推薦和資源留下，沒有要求雨澄回報。');
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

  it('證據句方向規則：「低」只從負向選項取證據，不會借用正向選項', () => {
    const content = loadContent();
    // 2026-09-28 分數重新校準後，五個 B 選項（invite-vague／notice-euphemism／answer-deflect／
    // doc-pressure／keep-credit）的 management_credibility 都轉為正向或接近零，不再適合示範
    // 「低」；改用五個 C 選項，management_credibility 全部是 -2（同分），同分取較晚：keep-confess。
    const majorChoiceIds = ['invite-goodnews', 'notice-performance', 'answer-bargain', 'doc-private', 'keep-confess'];
    const result = computeDebrief(content, 'ending-soft-knife', majorChoiceIds)!;
    const credibility = result.dimensions.find((d) => d.key === 'management_credibility')!;
    expect(credibility.level).toBe('低');
    expect(credibility.evidence).toBe('推薦、文件和作品核准還沒結束，就要求雨澄回應主管的私人感情。');
  });

  it('證據句方向規則：淨零且正負皆有的維度，畫面並列正負兩項證據', () => {
    const content = loadContent();
    // 2026-09-28 分數重新校準後，answer-deflect 的 information_quality 已轉為正向，換一組仍會
    // 淨零的組合：invite-clear +2、notice-performance -2、answer-bargain -2、doc-protect +1、
    // keep-advocate +1 → 加總 0，正負皆有；兩個負向同分（-2），較晚出現的 answer-bargain 勝出。
    const majorChoiceIds = ['invite-clear', 'notice-performance', 'answer-bargain', 'doc-protect', 'keep-advocate'];
    const result = computeDebrief(content, 'ending-soft-knife', majorChoiceIds)!;
    const info = result.dimensions.find((d) => d.key === 'information_quality')!;
    expect(info.evidence).toContain('兩個選擇互相抵銷');
    expect(info.evidence).toContain('會議前先說明要談職務調整，也說雅琳會在場，雨澄至少知道該準備什麼'); // invite-clear：最強正向
    expect(info.evidence).toContain('拿不存在的轉圜空間交換雨澄當場配合'); // answer-bargain：最強負向（與 notice-performance 同分，取較晚）
    expect(info.evidence).not.toContain('正向行為被另一個選擇抵銷'); // 舊版報表式措辭已撤回
  });

  it('END 04 封頂維度的證據必須引用 doc-private，不得引用 keep-advocate 等正向選擇', () => {
    const content = loadContent();
    // doc-private 現在會立即終止談話並跳過 Choice 5（見 PATHS 註解），
    // 因此這條路徑不會再同時出現 doc-private 與 keep-confess；封頂維度的證據只能來自 doc-private。
    const result = computeDebrief(content, 'ending-over-line', PATHS['ending-over-line']!)!;
    const capped = ['employee_agency', 'psychological_safety', 'process_integrity'];
    for (const key of capped) {
      const dimension = result.dimensions.find((d) => d.key === key)!;
      expect(['脆弱', '低'], key).toContain(dimension.level);
      expect(dimension.evidence, key).toBe('用私人金錢補正式給付，把公司責任變成一筆欠主管的人情。');
    }
  });

  it('END 04 由 boundary 累計觸發、未選 doc-private／keep-confess 時，封頂維度仍退回負向證據而非正向', () => {
    const content = loadContent();
    // 2026-09-28 分數重新校準後 doc-pressure 的 employee_agency 已轉為正向，換成仍含一個負向項
    // 的組合：invite-clear +1、notice-direct +1、answer-bargain -2、doc-protect +2、keep-advocate +1
    // → 加總 3（中），但本路徑結局仍傳入 ending-over-line（模擬未選旗標選項也可能因其他機制越線
    // 的情境），封頂應強制顯示「脆弱」，且因沒有 doc-private／keep-confess，須退回一般負向證據
    // （answer-bargain 是唯一負向項），不得顯示查無證據或借用正向選項。
    const majorChoiceIds = ['invite-clear', 'notice-direct', 'answer-bargain', 'doc-protect', 'keep-advocate'];
    const result = computeDebrief(content, 'ending-over-line', majorChoiceIds)!;
    const agency = result.dimensions.find((d) => d.key === 'employee_agency')!;
    expect(agency.level).toBe('脆弱');
    expect(agency.evidence).toBe('拿不存在的轉圜空間交換雨澄當場配合。');
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
});
