import type { LoadedContent } from '../data/contentLoader';
import type { MbaContent, MbaDimension, MbaScoreRow } from './schema';

/**
 * MBA Organizational Debrief 的計算層（見 property/mba-debrief.md「二、Debrief 使用的資料」）。
 * 內容資料（理論、stakeholder、結局分析、限制）全部是 ChatGPT 提供的正式文案；
 * 這裡只做「五個主要選擇 → 六項文字化組織狀態／因果鏈／理論鏡頭」的純函式計算，
 * 不讀取、不修改 StoryEngine 或存讀檔，方便單獨測試。
 */

/** 五個主要決策點固定依序對應到這些選項 ID（與 property/scenes 的技術欄位一致）。 */
const CHOICE_POINTS = [
  { key: 'choice1', options: ['invite-clear', 'invite-vague', 'invite-goodnews'] },
  { key: 'choice2', options: ['notice-direct', 'notice-euphemism', 'notice-performance'] },
  { key: 'choice3', options: ['answer-admit', 'answer-deflect', 'answer-bargain'] },
  { key: 'choice4', options: ['doc-protect', 'doc-pressure', 'doc-private'] },
  { key: 'choice5', options: ['keep-advocate', 'keep-credit', 'keep-confess'] },
] as const;

const DIMENSION_ORDER: readonly (keyof Omit<MbaScoreRow, 'evidence' | 'reactionQuote'>)[] = ['C', 'I', 'F', 'A', 'S', 'P'];

/**
 * v2 戲劇分析等級（見 property/mba-dramatic-analysis-scoring-v2-20260928.md「三、等級換算」）。
 * 取代舊版「高／中／脆弱／低」的數字門檻；不顯示數字，也不畫雷達面積。
 */
export type DebriefLevel = '穩定建立' | '部分建立' | '證據矛盾' | '未充分建立' | '明顯受損';

/** 供「上限」比較用的排序：數字越大代表越正面。未充分建立與證據矛盾都是「這輪沒有淨向哪一邊」，排序相鄰。 */
const LEVEL_RANK: Record<DebriefLevel, number> = { 穩定建立: 4, 部分建立: 3, 證據矛盾: 2, 未充分建立: 1, 明顯受損: 0 };

/**
 * 依「二、隱藏評分矩陣」非零列的加總，換算成 v2 的五種等級（見「三、等級換算」）：
 * - `3` 以上：穩定建立。`1–2`：部分建立。
 * - `0` 且同時有正負證據：證據矛盾（本輪既保護又傷害同一維度）。
 * - `0` 且沒有任何非零證據：未充分建立（五次選擇沒有實際測到這一面）。
 * - `-1` 以下：明顯受損。
 */
function levelForRows(values: readonly number[]): DebriefLevel {
  const sum = values.reduce((total, value) => total + value, 0);
  const hasPositive = values.some((value) => value > 0);
  const hasNegative = values.some((value) => value < 0);
  if (sum >= 3) return '穩定建立';
  if (sum >= 1) return '部分建立';
  if (sum === 0 && hasPositive && hasNegative) return '證據矛盾';
  if (sum === 0) return '未充分建立';
  return '明顯受損';
}

/**
 * 不可抵銷規則（見「四、不可抵銷規則」）：重大越線不能靠前面累積的好行為洗掉。
 * `at-most`＝這個維度最高只能顯示到 `cap`（原本更好時才下修，已經更差就不動）；
 * `fixed`＝只要選到這個選項，這個維度就固定顯示 `cap`（不看原始加總）。
 * 第六條「END 04 不另外憑結局名稱扣分」——即不再有舊版「只要是 ending-over-line 就封頂三個維度」
 * 的邏輯，全部改成只看玩家實際選了哪個選項。
 */
const NON_CANCELABLE_RULES: ReadonlyArray<{
  choiceId: string;
  dimensions: readonly string[];
  cap: DebriefLevel;
  mode: 'at-most' | 'fixed';
}> = [
  { choiceId: 'invite-goodnews', dimensions: ['management_credibility', 'information_quality'], cap: '證據矛盾', mode: 'at-most' },
  { choiceId: 'notice-performance', dimensions: ['information_quality', 'perceived_fairness', 'psychological_safety'], cap: '證據矛盾', mode: 'at-most' },
  { choiceId: 'answer-bargain', dimensions: ['management_credibility', 'perceived_fairness', 'employee_agency', 'psychological_safety'], cap: '明顯受損', mode: 'at-most' },
  { choiceId: 'doc-private', dimensions: ['perceived_fairness', 'employee_agency', 'psychological_safety', 'process_integrity'], cap: '明顯受損', mode: 'fixed' },
  { choiceId: 'keep-confess', dimensions: ['employee_agency', 'psychological_safety', 'process_integrity'], cap: '明顯受損', mode: 'fixed' },
];

function applyNonCancelableCaps(level: DebriefLevel, dimensionKey: string, majorChoiceIds: readonly string[]): DebriefLevel {
  let result = level;
  for (const rule of NON_CANCELABLE_RULES) {
    if (!rule.dimensions.includes(dimensionKey) || !majorChoiceIds.includes(rule.choiceId)) continue;
    if (rule.mode === 'fixed') {
      result = rule.cap;
    } else if (LEVEL_RANK[result] > LEVEL_RANK[rule.cap]) {
      result = rule.cap;
    }
  }
  return result;
}

/**
 * 依維度找主要證據的優先順序：每一項是 `majorChoiceIds` 的索引（0＝Choice1…4＝Choice5），
 * 見「五、證據分配」的「證據優先順序」表。找不到時（該題沒選、分數為 0，或已被其他卡片用掉）
 * 就依序退回下一個候選；全部找不到時，`findEvidenceEntry` 會再退回「不看優先序，依 Choice1…5
 * 自然順序找任一個還沒用過的非零選項」，避免明明有證據卻因為不在優先表裡而顯示「查無證據」。
 */
const EVIDENCE_PRIORITY: Record<keyof Omit<MbaScoreRow, 'evidence' | 'reactionQuote'>, readonly number[]> = {
  C: [2, 0, 4, 1],
  I: [0, 1, 2, 3],
  F: [3, 1, 2, 4],
  A: [2, 3, 1, 4],
  S: [4, 1, 2, 0],
  P: [3, 4, 2],
};

/** 一張組織狀態卡裡的一組證據：你的行動（選項原文）＋故事中的反應（既有台詞逐字引用）＋分析。 */
export interface DebriefEvidenceEntry {
  choiceId: string;
  actionQuote: string;
  reactionQuote: string;
  analysis: string;
}

export interface DebriefDimension {
  key: string;
  label: string;
  level: DebriefLevel;
  /** 穩定建立／部分建立／明顯受損通常 1 筆；證據矛盾最多 2 筆（一正一負）；未充分建立或找不到證據時為空陣列。 */
  entries: DebriefEvidenceEntry[];
  /** 只在 `entries` 為空時有值：本輪沒有可觀察行動，或找不到同方向證據。 */
  note?: string;
}

export interface DebriefStakeholder {
  key: string;
  name: string;
  outcome: string;
}

export interface DebriefAlternative {
  /** 一段完整的做法敘述（做法＋代價合寫成一段），畫面與摘要都不拆成改善／代價兩個標籤。 */
  text: string;
}

export interface DebriefCausalStep {
  /** 玩家當時選的那句選項原文。 */
  choiceText: string;
  /** 當下反應：這個選項的路徑證據句。 */
  immediate: string;
  /** 影響：這個選項對哪個維度造成的提升／降低。 */
  impact: string;
}

export interface DebriefTheory {
  /** 內容資料裡的理論鍵名，例如 `Informational Justice`（英文，供測試與去重比對）。 */
  name: string;
  /** 中文譯名，例如「資訊公平」。 */
  label: string;
  explanation: string;
  /** 「在這條路徑中」引用的那個決策點的路徑證據。 */
  pathEvidence: string;
}

export interface DebriefResult {
  endingId: string;
  endingTitle: string;
  /** 五個主要選擇的選項文字，依 choice1…choice5 順序。 */
  choiceTexts: string[];
  dimensions: DebriefDimension[];
  /** 依雨澄、予安、雅琳、微光互動的順序。 */
  stakeholders: DebriefStakeholder[];
  /** 影響最大的三個決策點，各自組成「選擇／當下／影響」三行。 */
  causalChains: DebriefCausalStep[];
  /** 結局層級的後果，只顯示一次，不重複塞進每一個因果鏈項目。 */
  overallConsequence: string;
  /** 固定三個，依實際選項而非題號挑選。 */
  theories: DebriefTheory[];
  /** 固定兩套替代策略（見 property/mba-organizational-debrief.md「五」）。 */
  alternatives: DebriefAlternative[];
  tradeoffsText: string;
  limitations: string[];
}

function findChoiceText(content: LoadedContent, choiceId: string): string {
  for (const scene of content.scenes.values()) {
    const choice = scene.choices.find((item) => item.id === choiceId);
    if (choice) return choice.text;
  }
  return choiceId;
}

function sumAbs(row: MbaScoreRow): number {
  return DIMENSION_ORDER.reduce((total, key) => total + Math.abs(row[key]), 0);
}

function dominantDimension(mba: MbaContent, row: MbaScoreRow): { label: string; value: number } | undefined {
  let best: { label: string; value: number; abs: number } | undefined;
  for (const dim of Object.values(mba.dimensions)) {
    const value = row[dim.scoreKey];
    const abs = Math.abs(value);
    if (!best || abs > best.abs) best = { label: dim.label, value, abs };
  }
  return best;
}

const NO_STABLE_EVIDENCE = '本輪沒有足夠的可觀察行動。';

/**
 * 在 `priorityIndices`（`EVIDENCE_PRIORITY` 的其中一組）指定的順序裡，找第一個「玩家真的選了、
 * 這個維度非零、還沒被其他卡片用掉」的選項；找不到就退回「依 Choice1…5 自然順序，找任一個還沒
 * 用過的非零選項」，確保不會因為優先表沒列到某個決策點就誤判成查無證據。
 */
function findEvidenceEntry(
  priorityIndices: readonly number[],
  majorChoiceIds: readonly string[],
  scores: Record<string, MbaScoreRow>,
  dimensionKey: keyof Omit<MbaScoreRow, 'evidence' | 'reactionQuote'>,
  direction: 'positive' | 'negative',
  used: ReadonlySet<string>,
): string | undefined {
  const matches = (choiceId: string | undefined): boolean => {
    if (!choiceId || used.has(choiceId)) return false;
    const row = scores[choiceId];
    if (!row) return false;
    const value = row[dimensionKey];
    return direction === 'positive' ? value > 0 : value < 0;
  };
  for (const index of priorityIndices) {
    const choiceId = majorChoiceIds[index];
    if (matches(choiceId)) return choiceId;
  }
  return majorChoiceIds.find((choiceId) => matches(choiceId));
}

/**
 * 組出一張「組織狀態卡」（見「五、最後分析畫面」）：先用該維度非零列的加總換算等級、套用不可抵銷
 * 上限，再依最終等級決定要顯示幾筆證據——穩定建立／部分建立各挑一筆正向、明顯受損挑一筆負向、
 * 證據矛盾同時挑一正一負、未充分建立不挑（沒有非零證據可挑）。挑中的選項會計入 `used`，讓後面
 * 處理的維度不會重複引用同一句（見「六張卡不可共用同一句泛用說明」）。
 */
function buildDimension(
  content: LoadedContent,
  mba: MbaContent,
  key: string,
  dim: MbaDimension,
  majorChoiceIds: readonly string[],
  used: Set<string>,
): DebriefDimension {
  const values = majorChoiceIds
    .map((choiceId) => (choiceId ? mba.scores[choiceId] : undefined))
    .filter((row): row is MbaScoreRow => row !== undefined)
    .map((row) => row[dim.scoreKey])
    .filter((value) => value !== 0);

  let level = levelForRows(values);
  level = applyNonCancelableCaps(level, key, majorChoiceIds);

  const priority = EVIDENCE_PRIORITY[dim.scoreKey];
  const toEntry = (choiceId: string): DebriefEvidenceEntry => {
    const row = mba.scores[choiceId]!;
    return { choiceId, actionQuote: findChoiceText(content, choiceId), reactionQuote: row.reactionQuote, analysis: row.evidence };
  };

  const entries: DebriefEvidenceEntry[] = [];
  if (level === '證據矛盾') {
    const positiveId = findEvidenceEntry(priority, majorChoiceIds, mba.scores, dim.scoreKey, 'positive', used);
    if (positiveId) { entries.push(toEntry(positiveId)); used.add(positiveId); }
    const negativeId = findEvidenceEntry(priority, majorChoiceIds, mba.scores, dim.scoreKey, 'negative', used);
    if (negativeId) { entries.push(toEntry(negativeId)); used.add(negativeId); }
  } else if (level === '穩定建立' || level === '部分建立') {
    const positiveId = findEvidenceEntry(priority, majorChoiceIds, mba.scores, dim.scoreKey, 'positive', used);
    if (positiveId) { entries.push(toEntry(positiveId)); used.add(positiveId); }
  } else if (level === '明顯受損') {
    const negativeId = findEvidenceEntry(priority, majorChoiceIds, mba.scores, dim.scoreKey, 'negative', used);
    if (negativeId) { entries.push(toEntry(negativeId)); used.add(negativeId); }
  }
  // 未充分建立：不挑證據（sum=0 且沒有任何非零選項，本來就沒有東西可挑）。

  return { key, label: dim.label, level, entries, note: entries.length === 0 ? NO_STABLE_EVIDENCE : undefined };
}

interface MagnitudePoint {
  point: string;
  choiceId: string | undefined;
  row: MbaScoreRow | undefined;
  magnitude: number;
}

/**
 * 結局有辨識度較高的理論時優先納入（見 property/mba-debrief-sepia-revision-20260927.md「四」第 3 點）；
 * TRUE END 沒有清單，依實際三個最強正向選擇取值，不硬塞固定名單。
 */
const ENDING_PREFERRED_THEORIES: Record<string, readonly string[]> = {
  'ending-decent': ['Social Exchange', 'Procedural Justice', 'Leader–Member Exchange'],
  'ending-soft-knife': ['Informational Justice', 'Impression Management', 'Emotional Labor'],
  'ending-over-line': ['Power-Dependence', 'Social Exchange', 'Agency Problem'],
};

/**
 * 理論鏡頭固定顯示三個，依「property/mba-debrief-sepia-revision-20260927.md」四之 1–4：
 * 1. 依本路徑影響最大的選項排序。
 * 2. 每個選項先取表中第一個尚未出現的理論；能從三個不同選項各取一個時，不讓同一選項包辦三個。
 * 3. 結局有辨識度較高的理論時優先（TRUE END 除外）。
 * 4. 證據必須引用真正帶入該理論的那個選項，不共用同一決策點的泛用證據。
 */
function selectTheories(mba: MbaContent, endingId: string, byMagnitudeDesc: readonly MagnitudePoint[]): DebriefTheory[] {
  const candidatesFor = (choiceId: string): readonly string[] => mba.choiceTheories[choiceId] ?? [];
  const toTheory = (name: string, row: MbaScoreRow): DebriefTheory => {
    const text = mba.theories[name];
    return { name, label: text?.label ?? name, explanation: text?.explanation ?? '', pathEvidence: row.evidence };
  };

  const usedSources = new Set<string>();
  const usedTheories = new Set<string>();
  const selected: DebriefTheory[] = [];

  const preferred = ENDING_PREFERRED_THEORIES[endingId] ?? [];
  for (const name of preferred) {
    if (selected.length >= 3) break;
    const point = byMagnitudeDesc.find(
      (p) => p.choiceId && p.row && !usedSources.has(p.choiceId) && candidatesFor(p.choiceId).includes(name),
    );
    if (!point || !point.choiceId || !point.row) continue;
    selected.push(toTheory(name, point.row));
    usedSources.add(point.choiceId);
    usedTheories.add(name);
  }

  // 優先讓三個理論各自來自不同的選項。
  for (const point of byMagnitudeDesc) {
    if (selected.length >= 3) break;
    if (!point.choiceId || !point.row || usedSources.has(point.choiceId)) continue;
    const name = candidatesFor(point.choiceId).find((candidate) => !usedTheories.has(candidate));
    if (!name) continue;
    selected.push(toTheory(name, point.row));
    usedSources.add(point.choiceId);
    usedTheories.add(name);
  }

  // 少數選項理論庫存不足以覆蓋三個不同來源時，允許已用過的選項再貢獻下一個理論。
  for (const point of byMagnitudeDesc) {
    if (selected.length >= 3) break;
    if (!point.choiceId || !point.row) continue;
    const name = candidatesFor(point.choiceId).find((candidate) => !usedTheories.has(candidate));
    if (!name) continue;
    selected.push(toTheory(name, point.row));
    usedTheories.add(name);
  }

  return selected;
}

/**
 * @param majorChoiceIds 這一輪玩家實際選的五個主要選項 ID，依 choice1…choice5 順序
 *   （通常取自 `engine.decisionPoints.map(d => d.choiceId)`；感情線微選擇本來就不在裡面）。
 * @returns 找不到結局分析內容時回傳 undefined（例如結局 ID 打字錯誤，或內容尚未提供）。
 */
export function computeDebrief(content: LoadedContent, endingId: string, majorChoiceIds: readonly string[]): DebriefResult | undefined {
  const { mba } = content;
  const ending = mba.endings[endingId];
  if (!ending) return undefined;

  // 依 C／I／F／A／S／P 固定順序處理（等同畫面卡片由上到下的順序），讓「已被前一張卡用掉的
  // 選項」在處理後面的維度時正確被排除，六張卡才不會共用同一句證據。
  const usedEvidenceChoices = new Set<string>();
  const dimensions: DebriefDimension[] = Object.entries(mba.dimensions).map(([key, dim]) =>
    buildDimension(content, mba, key, dim, majorChoiceIds, usedEvidenceChoices),
  );

  const stakeholderOrder: Array<{ key: string; outcome: string }> = [
    { key: 'lin-yucheng', outcome: ending.stakeholderOutcomes['lin-yucheng'] ?? '' },
    { key: 'zhou-yuan', outcome: ending.stakeholderOutcomes['zhou-yuan'] ?? '' },
    { key: 'zeng-yalin', outcome: ending.stakeholderOutcomes['zeng-yalin'] ?? '' },
    // 微光互動現在有逐結局撰寫的具體結果句（見 mba-debrief.json），不再借用整體管理策略摘要。
    { key: 'company', outcome: ending.stakeholderOutcomes['company'] ?? ending.strategy },
  ];
  const stakeholders: DebriefStakeholder[] = stakeholderOrder.map(({ key, outcome }) => ({
    key,
    name: mba.stakeholders[key]?.name ?? key,
    outcome,
  }));

  const perPoint = CHOICE_POINTS.map((point, index) => {
    const choiceId = majorChoiceIds[index];
    const row = choiceId ? mba.scores[choiceId] : undefined;
    return { point: point.key, choiceId, row, magnitude: row ? sumAbs(row) : 0 };
  });
  const byMagnitudeDesc = [...perPoint].sort((a, b) => b.magnitude - a.magnitude);

  // 三個關鍵選擇：取影響最大的三個決策點，各自組成「選擇／當下／影響」三行。結局層級的
  // 後果不重複塞進每一項，只在 overallConsequence 顯示一次（見 property/mba-debrief-sepia-revision-20260927.md「三、因果鏈」）。
  const causalChains: DebriefCausalStep[] = byMagnitudeDesc.slice(0, 3).flatMap(({ choiceId, row }) => {
    if (!choiceId || !row) return [];
    const dominant = dominantDimension(mba, row);
    const direction = dominant && dominant.value < 0 ? '降低' : '提升';
    const impact = dominant ? `${dominant.label}${direction}` : '';
    return [{ choiceText: findChoiceText(content, choiceId), immediate: row.evidence, impact }];
  });

  const theories = selectTheories(mba, endingId, byMagnitudeDesc);

  return {
    endingId,
    endingTitle: content.scenes.get(endingId)?.title ?? endingId,
    choiceTexts: majorChoiceIds.map((id) => findChoiceText(content, id)),
    dimensions,
    stakeholders,
    causalChains,
    overallConsequence: ending.unintendedConsequence,
    theories,
    alternatives: ending.alternatives.map((text) => ({ text })),
    tradeoffsText: mba.copy.tradeoffsText,
    limitations: mba.copy.limitations,
  };
}

/**
 * 「複製本次摘要」的純文字輸出：五個選擇、結局、六項狀態（等級＋證據，不含內部數值）、
 * 理論與替代方案，供期末報告貼上使用。
 */
export function formatDebriefSummary(result: DebriefResult): string {
  const lines: string[] = [];
  lines.push(`《最後一次一對一》案例紀錄｜${result.endingTitle}`);
  lines.push('');
  lines.push('本次選擇：');
  result.choiceTexts.forEach((text, index) => lines.push(`${index + 1}. ${text}`));
  lines.push('');
  lines.push('組織狀態：');
  for (const dimension of result.dimensions) {
    lines.push(`${dimension.label}：${dimension.level}`);
    if (dimension.entries.length === 0) {
      lines.push(`　${dimension.note ?? ''}`);
      continue;
    }
    for (const entry of dimension.entries) {
      lines.push(`　你的行動：${entry.actionQuote}`);
      lines.push(`　故事中的反應：${entry.reactionQuote}`);
      lines.push(`　分析：${entry.analysis}`);
    }
  }
  lines.push('');
  lines.push('各方結果：');
  for (const stakeholder of result.stakeholders) lines.push(`${stakeholder.name}：${stakeholder.outcome}`);
  lines.push('');
  lines.push('相關的組織行為概念：');
  for (const theory of result.theories) {
    lines.push(`${theory.name}／${theory.label}：${theory.explanation}對應證據：${theory.pathEvidence}`);
  }
  lines.push('');
  lines.push('其他可行做法：');
  result.alternatives.forEach((alternative, index) => {
    if (index > 0) lines.push('');
    lines.push(alternative.text);
  });
  return lines.join('\n');
}
