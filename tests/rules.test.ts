import { describe, expect, it } from 'vitest';
import { applyChoiceEffects, isChoiceAvailable } from '../src/engine/rules';
import type { Choice } from '../src/domain/schema';

describe('story rules', () => {
  it('applies numeric effects without mutating the original state', () => {
    const state = { trust: 1 };
    const choice: Choice = {
      id: 'x', text: 'x', next: 'next',
      effects: [{ variable: 'trust', operation: 'add', value: 2 }],
    };
    const next = applyChoiceEffects(choice, state);
    expect(next.trust).toBe(3);
    expect(state.trust).toBe(1);
  });

  it('checks conditions from data', () => {
    const choice: Choice = {
      id: 'x', text: 'x', next: 'next',
      conditions: [{ variable: 'trust', operator: 'gte', value: 2 }],
    };
    expect(isChoiceAvailable(choice, { trust: 2 })).toBe(true);
    expect(isChoiceAvailable(choice, { trust: 1 })).toBe(false);
  });
});
