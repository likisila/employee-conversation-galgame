import type { LoadedContent } from '../data/contentLoader';
import type { MbaAuthorityRow } from './schema';

/**
 * MBA 最後分析 v3 的組裝層（見 property/mba-final-analysis-managerial-judgment-v3-20260929.md）。
 * 取代 v2 的六維計分／等級／不可抵銷規則／理論篩選／因果鏈：五個主要選擇只作為路徑時間線的
 * 證據，實際分析依 ending ID 選一篇固定的管理判斷／決策權／衝突與合作／主問題回答＋一項替代
 * 做法，全部是 ChatGPT 提供的正式文案。這裡只做「majorChoiceIds + endingId → 畫面需要的完整
 * 結構」的純函式組裝，不讀寫 StoryEngine 或存讀檔，方便單獨測試。
 */

function findChoiceText(content: LoadedContent, choiceId: string): string {
  for (const scene of content.scenes.values()) {
    const choice = scene.choices.find((item) => item.id === choiceId);
    if (choice) return choice.text;
  }
  return choiceId;
}

/** 路徑時間線裡的一步：固定標籤（例如「邀請方式」）＋玩家當時選的那句選項原文。 */
export interface DebriefPathStep {
  label: string;
  choiceText: string;
}

export interface DebriefResult {
  endingId: string;
  /** 結局場景本身的標題，例如「TRUE END：真正的告別」。 */
  endingTitle: string;
  /** 這個結局代表的管理模式，例如「TRUE END｜辨認權限，保留合作」。 */
  endingLabel: string;
  mainQuestion: string;
  sharedConclusion: string;
  /** 四個角色的權限地圖，四個結局共用。 */
  authorityMap: MbaAuthorityRow[];
  /** 玩家實際做過的主要選擇時間線，依 choice1…choice5 順序（`doc-private` 立即終止談話時只有 4 步）。 */
  path: DebriefPathStep[];
  managerialJudgment: string;
  decisionRights: string;
  conflictCollaboration: string;
  answer: string;
  alternative: string;
  finalConclusionTitle: string;
  finalConclusionBody: string;
  courseLinkSentence: string;
  analysisLimitation: string;
}

/**
 * @param majorChoiceIds 這一輪玩家實際選的主要選項 ID，依 choice1…choice5 順序
 *   （通常取自 `engine.decisionPoints.map(d => d.choiceId)`；感情線微選擇本來就不在裡面；
 *   `doc-private` 立即終止談話時只有 4 個）。
 * @returns 找不到結局分析內容時回傳 undefined（例如結局 ID 打字錯誤，或內容尚未提供）。
 */
export function computeDebrief(content: LoadedContent, endingId: string, majorChoiceIds: readonly string[]): DebriefResult | undefined {
  const { mba } = content;
  const ending = mba.endings[endingId];
  if (!ending) return undefined;

  const path: DebriefPathStep[] = majorChoiceIds.map((choiceId, index) => ({
    label: mba.copy.decisionPointLabels[index] ?? `選擇 ${index + 1}`,
    choiceText: findChoiceText(content, choiceId),
  }));

  return {
    endingId,
    endingTitle: content.scenes.get(endingId)?.title ?? endingId,
    endingLabel: ending.label,
    mainQuestion: mba.copy.mainQuestion,
    sharedConclusion: mba.copy.sharedConclusion,
    authorityMap: mba.authorityMap,
    path,
    managerialJudgment: ending.managerialJudgment,
    decisionRights: ending.decisionRights,
    conflictCollaboration: ending.conflictCollaboration,
    answer: ending.answer,
    alternative: ending.alternative,
    finalConclusionTitle: mba.copy.finalConclusionTitle,
    finalConclusionBody: mba.copy.finalConclusionBody,
    courseLinkSentence: mba.copy.courseLinkSentence,
    analysisLimitation: mba.copy.analysisLimitation,
  };
}

/**
 * 「複製本次摘要」的純文字輸出：主問題、共同結論、權限地圖、五次選擇、結局路徑分析、替代做法
 * 與結論，結構與畫面一致（見 property/mba-organizational-debrief.md「八、Claude 實作需求」第 6 點），
 * 供期末報告貼上使用。
 */
export function formatDebriefSummary(result: DebriefResult): string {
  const lines: string[] = [];
  lines.push(`《最後一次一對一》案例紀錄｜${result.endingTitle}｜${result.endingLabel}`);
  lines.push('');
  lines.push('主問題：');
  lines.push(result.mainQuestion);
  lines.push('');
  lines.push('共同結論：');
  lines.push(result.sharedConclusion);
  lines.push('');
  lines.push('權限地圖：');
  for (const row of result.authorityMap) {
    lines.push(`${row.role}｜能決定：${row.canDecide}｜不能決定：${row.cannotDecide}`);
  }
  lines.push('');
  lines.push('本次選擇：');
  result.path.forEach((step, index) => lines.push(`${index + 1}. ${step.label}：${step.choiceText}`));
  lines.push('');
  lines.push('這條路徑的綜合分析：');
  lines.push(`管理判斷：${result.managerialJudgment}`);
  lines.push(`決策權如何被使用：${result.decisionRights}`);
  lines.push(`衝突與合作：${result.conflictCollaboration}`);
  lines.push(`對主問題的回答：${result.answer}`);
  lines.push('');
  lines.push('另一種做法與代價：');
  lines.push(result.alternative);
  lines.push('');
  lines.push(`結論：${result.finalConclusionTitle}`);
  lines.push(result.finalConclusionBody);
  lines.push(result.courseLinkSentence);
  lines.push('');
  lines.push('分析限制：');
  lines.push(result.analysisLimitation);
  return lines.join('\n');
}
