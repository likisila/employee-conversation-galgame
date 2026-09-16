import { describe, expect, it } from 'vitest';
import { applyChoiceEffects, isChoiceAvailable, isLineVisible, resolveRoute } from '../src/engine/rules';
import type { Choice, Scene } from '../src/domain/schema';

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

  it('shows a line only when all its conditions hold; unconditional lines always show', () => {
    const conditional = { speaker: null, text: 'x', conditions: [{ variable: 'choice1', operator: 'eq' as const, value: 'clear' }] };
    expect(isLineVisible(conditional, { choice1: 'clear' })).toBe(true);
    expect(isLineVisible(conditional, { choice1: 'vague' })).toBe(false);
    expect(isLineVisible(conditional, {})).toBe(false);
    expect(isLineVisible({ speaker: null, text: 'y' }, {})).toBe(true);
  });

  it('supports neq so a line can cover "everything except one branch"', () => {
    const line = { speaker: null, text: 'x', conditions: [{ variable: 'choice2', operator: 'neq' as const, value: 'performance' }] };
    expect(isLineVisible(line, { choice2: 'direct' })).toBe(true);
    expect(isLineVisible(line, { choice2: 'performance' })).toBe(false);
  });

  it('resolves a route by priority: first matching entry wins, unconditional entry is the default', () => {
    const scene: Scene = {
      id: 'gate', lines: [], choices: [],
      route: [
        { conditions: [{ variable: 'boundary', operator: 'lte', value: -2 }], next: 'over-line' },
        { conditions: [{ variable: 'trust', operator: 'gte', value: 6 }, { variable: 'boundary', operator: 'gte', value: 2 }], next: 'true' },
        { next: 'default' },
      ],
    };
    // 越線優先於 TRUE END，即使其他門檻也達標
    expect(resolveRoute(scene, { boundary: -2, trust: 9 })).toBe('over-line');
    expect(resolveRoute(scene, { boundary: 3, trust: 6 })).toBe('true');
    // 多條件必須全部成立
    expect(resolveRoute(scene, { boundary: 1, trust: 6 })).toBe('default');
    expect(resolveRoute({ id: 'plain', lines: [], choices: [] }, {})).toBeUndefined();
  });
});
