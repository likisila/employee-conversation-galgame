import type { Choice, Condition, GameState, GameValue, Line, Scene } from '../domain/schema';

function compare(left: GameValue | undefined, operator: string, right: GameValue): boolean {
  switch (operator) {
    case 'eq': return left === right;
    case 'neq': return left !== right;
    case 'gt': return typeof left === 'number' && typeof right === 'number' && left > right;
    case 'gte': return typeof left === 'number' && typeof right === 'number' && left >= right;
    case 'lt': return typeof left === 'number' && typeof right === 'number' && left < right;
    case 'lte': return typeof left === 'number' && typeof right === 'number' && left <= right;
    default: return false;
  }
}

/** 一組條件是否全部成立（未提供條件視為成立）。 */
export function matchesConditions(conditions: Condition[] | undefined, state: GameState): boolean {
  return (conditions ?? []).every((condition) =>
    compare(state[condition.variable], condition.operator, condition.value),
  );
}

export function isChoiceAvailable(choice: Choice, state: GameState): boolean {
  return matchesConditions(choice.conditions, state);
}

/** 依目前狀態決定台詞是否顯示，用於「依先前選擇」的分歧敘事。 */
export function isLineVisible(line: Line, state: GameState): boolean {
  return matchesConditions(line.conditions, state);
}

/**
 * 依優先序路由：回傳第一個條件全部成立的目標場景，找不到則回傳 undefined。
 * 用來實作結局優先序（越線 → TRUE END → 體面的句點 → 柔軟的刀）。
 */
export function resolveRoute(scene: Scene, state: GameState): string | undefined {
  if (!scene.route) return undefined;
  return scene.route.find((entry) => matchesConditions(entry.conditions, state))?.next;
}

export function applyChoiceEffects(choice: Choice, state: GameState): GameState {
  const next = { ...state };
  for (const effect of choice.effects ?? []) {
    if (effect.operation === 'set') {
      next[effect.variable] = effect.value;
      continue;
    }
    const current = next[effect.variable];
    if (typeof current !== 'number' || typeof effect.value !== 'number') {
      throw new Error(`add 只能用於數值變數：${effect.variable}`);
    }
    next[effect.variable] = current + effect.value;
  }
  return next;
}
