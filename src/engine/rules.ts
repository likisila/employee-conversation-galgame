import type { Choice, GameState, GameValue } from '../domain/schema';

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

export function isChoiceAvailable(choice: Choice, state: GameState): boolean {
  return (choice.conditions ?? []).every((condition) =>
    compare(state[condition.variable], condition.operator, condition.value),
  );
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
