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

export interface DebriefResult {
  endingId: string;
  endingTitle: string;
  /** 五個主要選擇的選項文字，依 choice1…choice5 順序。 */
  choiceTexts: string[];
  dimensions: DebriefDimension[];
  /** 依雨澄、予安、雅琳、微光互動的順序。 */
  stakeholders: DebriefStakeholder[];
  causalChains: string[];
  theories: string[];
  alternative: DebriefAlternative;
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

function splitAlternative(raw: string): DebriefAlternative {
  const [improvement, cost] = raw.split('；代價是');
  return { improvement: (improvement ?? raw).trim(), cost: (cost ?? '').trim() };
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
    let sum = 0;
    let bestChoiceId: string | undefined;
    let bestAbs = -1;
    for (const choiceId of majorChoiceIds) {
      const row = mba.scores[choiceId];
      if (!row) continue;
      const value = row[dim.scoreKey];
      sum += value;
      const abs = Math.abs(value);
      // >= 而非 >：同分時取較晚（陣列中較後面）的選擇，呈現 delayed consequence。
      if (abs >= bestAbs) {
        bestAbs = abs;
        bestChoiceId = choiceId;
      }
    }
    let level = levelForSum(sum);
    if (endingId === 'ending-over-line' && CLAMPED_TO_FRAGILE_ON_OVER_LINE.has(key) && LEVEL_RANK[level] > LEVEL_RANK['脆弱']) {
      level = '脆弱';
    }
    const evidence = bestChoiceId ? mba.scores[bestChoiceId]!.evidence : '';
    return { key, label: dim.label, level, evidence };
  });

  const stakeholderOrder: Array<{ key: string; outcome: string }> = [
    { key: 'lin-yucheng', outcome: ending.stakeholderOutcomes['lin-yucheng'] ?? '' },
    { key: 'zhou-yuan', outcome: ending.stakeholderOutcomes['zhou-yuan'] ?? '' },
    { key: 'zeng-yalin', outcome: ending.stakeholderOutcomes['zeng-yalin'] ?? '' },
    // 微光互動沒有逐結局撰寫的結果句；管理策略本身就是公司／決策層這一段的視角，直接沿用。
    { key: 'company', outcome: ending.strategy },
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
  const theories: string[] = [];
  let pointsUsed = 0;
  for (const { point } of byMagnitudeDesc) {
    if (pointsUsed >= 2 && theories.length >= 3) break;
    if (theories.length >= 5) break;
    for (const theory of mba.choiceTheories[point] ?? []) {
      if (!theories.includes(theory)) theories.push(theory);
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
    alternative: splitAlternative(ending.alternative),
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
  lines.push(result.theories.join('、'));
  lines.push('');
  lines.push('換一種做法：');
  lines.push(`改善：${result.alternative.improvement}`);
  lines.push(`代價：${result.alternative.cost}`);
  return lines.join('\n');
}
