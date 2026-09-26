import type { LoadedContent } from '../data/contentLoader';
import type { MbaContent, MbaScoreRow } from './schema';

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

const DIMENSION_ORDER: readonly (keyof Omit<MbaScoreRow, 'evidence'>)[] = ['C', 'I', 'F', 'A', 'S', 'P'];

export type DebriefLevel = '高' | '中' | '脆弱' | '低';

const LEVEL_RANK: Record<DebriefLevel, number> = { 高: 3, 中: 2, 脆弱: 1, 低: 0 };

function levelForSum(sum: number): DebriefLevel {
  if (sum >= 5) return '高';
  if (sum >= 1) return '中';
  if (sum >= -2) return '脆弱';
  return '低';
}

/**
 * END 04（越線）的三個維度不能因為其他選擇正向而顯得體面：即使加總數字落在「中」或「高」，
 * 畫面最高也只顯示「脆弱」，避免掩蓋這一路徑本身就是重大越線。
 */
const CLAMPED_TO_FRAGILE_ON_OVER_LINE = new Set(['employee_agency', 'psychological_safety', 'process_integrity']);

export interface DebriefDimension {
  key: string;
  label: string;
  level: DebriefLevel;
  evidence: string;
}

export interface DebriefStakeholder {
  key: string;
  name: string;
  outcome: string;
}

export interface DebriefAlternative {
  improvement: string;
  cost: string;
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
  causalChains: string[];
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

/** 正式內容用「；改善是……，代價是……」或舊式「；代價是……」，兩種分隔都支援。 */
function splitAlternative(raw: string): DebriefAlternative {
  const costMarker = raw.includes('，代價是') ? '，代價是' : '；代價是';
  const [improvement, cost] = raw.split(costMarker);
  return { improvement: (improvement ?? raw).trim(), cost: (cost ?? '').replace(/。$/, '').trim() };
}

const NO_STABLE_EVIDENCE = '這條路徑未建立足以穩定此維度的行為證據';

/** 造成 END 04 越線的兩個旗標選項；封頂維度的證據只能引用這兩者，兩者皆出現時取較晚的 `keep-confess`。 */
const OVER_LINE_FLAG_CHOICES = ['doc-private', 'keep-confess'];

interface DimensionRow {
  choiceId: string;
  value: number;
  evidence: string;
}

/** 依方向（正／負）挑影響最大的一筆；同分時取較晚（陣列中較後面）的選擇，呈現 delayed consequence。 */
function pickDirectional(rows: readonly DimensionRow[], direction: 'positive' | 'negative'): DimensionRow | undefined {
  let best: DimensionRow | undefined;
  for (const row of rows) {
    if (direction === 'positive' ? row.value <= 0 : row.value >= 0) continue;
    if (!best || Math.abs(row.value) >= Math.abs(best.value)) best = row;
  }
  return best;
}

/**
 * 依「證據句方向規則」（property/mba-organizational-debrief.md「二、證據句方向規則」）決定一個維度
 * 顯示的等級與對應證據文字：
 * 1. 高／中只取正向證據、脆弱／低只取負向證據，同分取較晚的選擇。
 * 2. END 04 的三個封頂維度（不論這次加總數字原本是否已經落在脆弱／低，只要是這三個維度且結局是
 *    越線）一律優先引用造成越線的 `doc-private`／`keep-confess`（較晚者優先），不得引用
 *    `keep-advocate` 等正向選擇——但越線也可能單純由 boundary 累計觸發、未選這兩項，此時仍要有
 *    負向證據可用，因此在兩者皆不存在時退回一般的負向證據挑選，而不是顯示「查無證據」。
 * 3. 分數為零且正負皆有：不得用單一正向句解釋「脆弱」，並列一正一負兩項證據。
 * 4. 該方向完全沒有非零選項時，顯示「查無穩定證據」，不借用不相關選項。
 */
function resolveDimensionEvidence(rows: readonly DimensionRow[], level: DebriefLevel, sum: number, isOverLineSpecialDimension: boolean): string {
  if (isOverLineSpecialDimension) {
    const flagRows = rows.filter((row) => OVER_LINE_FLAG_CHOICES.includes(row.choiceId));
    // rows 依 choice1…choice5 順序排列，OVER_LINE_FLAG_CHOICES 內較晚出現的（keep-confess）自然排在陣列後面。
    const chosen = flagRows[flagRows.length - 1];
    if (chosen) return chosen.evidence;
    // 越線由 boundary 累計觸發、未選 doc-private／keep-confess：退回一般負向證據，仍不得引用正向選擇。
    const fallback = pickDirectional(rows, 'negative');
    return fallback ? fallback.evidence : NO_STABLE_EVIDENCE;
  }
  if (level === '高' || level === '中') {
    const chosen = pickDirectional(rows, 'positive');
    return chosen ? chosen.evidence : NO_STABLE_EVIDENCE;
  }
  const positives = rows.filter((row) => row.value > 0);
  const negatives = rows.filter((row) => row.value < 0);
  if (sum === 0 && positives.length > 0 && negatives.length > 0) {
    const bestPositive = pickDirectional(rows, 'positive')!;
    const bestNegative = pickDirectional(rows, 'negative')!;
    return `正向行為被另一個選擇抵銷：${bestPositive.evidence}；但${bestNegative.evidence}`;
  }
  const chosen = pickDirectional(rows, 'negative');
  return chosen ? chosen.evidence : NO_STABLE_EVIDENCE;
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

  const dimensions: DebriefDimension[] = Object.entries(mba.dimensions).map(([key, dim]) => {
    const rows: DimensionRow[] = [];
    let sum = 0;
    for (const choiceId of majorChoiceIds) {
      const row = mba.scores[choiceId];
      if (!row) continue;
      const value = row[dim.scoreKey];
      sum += value;
      rows.push({ choiceId, value, evidence: row.evidence });
    }
    let level = levelForSum(sum);
    const isOverLineSpecialDimension = endingId === 'ending-over-line' && CLAMPED_TO_FRAGILE_ON_OVER_LINE.has(key);
    if (isOverLineSpecialDimension && LEVEL_RANK[level] > LEVEL_RANK['脆弱']) level = '脆弱';
    const evidence = resolveDimensionEvidence(rows, level, sum, isOverLineSpecialDimension);
    return { key, label: dim.label, level, evidence };
  });

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

  // 三條因果鏈：取影響最大的三個決策點，各自組成「選擇 → 當場反應 → 組織機制 → 延遲後果」。
  const causalChains = byMagnitudeDesc.slice(0, 3).map(({ choiceId, row }) => {
    if (!choiceId || !row) return '';
    const dominant = dominantDimension(mba, row);
    const direction = dominant && dominant.value < 0 ? '降低' : '提升';
    const mechanism = dominant ? `${dominant.label}${direction}` : '';
    return `${findChoiceText(content, choiceId)} → ${row.evidence} → ${mechanism} → ${ending.unintendedConsequence}`;
  }).filter((chain) => chain.length > 0);

  // 理論鏡頭：依影響最大的決策點依序納入整組理論，累積到至少兩個決策點、三個理論後停止，
  // 最後再截到最多五個——不是固定挑某幾個名詞，也不是整頁列出五個決策點的全部理論。
  // 每個理論的「在這條路徑中」證據，取自它第一次被納入時所屬的那個決策點的路徑證據句。
  const theories: DebriefTheory[] = [];
  let pointsUsed = 0;
  for (const { point, row } of byMagnitudeDesc) {
    if (pointsUsed >= 2 && theories.length >= 3) break;
    if (theories.length >= 5) break;
    for (const name of mba.choiceTheories[point] ?? []) {
      if (theories.some((theory) => theory.name === name)) continue;
      const text = mba.theories[name];
      theories.push({ name, label: text?.label ?? name, explanation: text?.explanation ?? '', pathEvidence: row?.evidence ?? '' });
    }
    pointsUsed += 1;
  }

  return {
    endingId,
    endingTitle: content.scenes.get(endingId)?.title ?? endingId,
    choiceTexts: majorChoiceIds.map((id) => findChoiceText(content, id)),
    dimensions,
    stakeholders,
    causalChains,
    theories: theories.slice(0, 5),
    alternatives: ending.alternatives.map(splitAlternative),
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
  lines.push(`《最後一次一對一》案例摘要 — ${result.endingTitle}`);
  lines.push('');
  lines.push('管理路徑：');
  result.choiceTexts.forEach((text, index) => lines.push(`${index + 1}. ${text}`));
  lines.push('');
  lines.push('組織狀態：');
  for (const dimension of result.dimensions) lines.push(`${dimension.label}：${dimension.level}——${dimension.evidence}`);
  lines.push('');
  lines.push('利害關係人結果：');
  for (const stakeholder of result.stakeholders) lines.push(`${stakeholder.name}：${stakeholder.outcome}`);
  lines.push('');
  lines.push('理論鏡頭：');
  for (const theory of result.theories) {
    lines.push(`${theory.name}／${theory.label}：${theory.explanation}在這條路徑中：${theory.pathEvidence}`);
  }
  lines.push('');
  lines.push('換一種做法：');
  result.alternatives.forEach((alternative, index) => {
    lines.push(`方案 ${index + 1} 改善：${alternative.improvement}`);
    lines.push(`方案 ${index + 1} 代價：${alternative.cost}`);
  });
  return lines.join('\n');
}
