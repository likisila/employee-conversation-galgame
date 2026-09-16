export type GameValue = string | number | boolean;
export type GameState = Record<string, GameValue>;

export interface Character {
  id: string;
  displayName: string;
  role?: string;
  avatar?: string;
}

export interface Condition {
  variable: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  value: GameValue;
}

export interface Effect {
  variable: string;
  operation: 'set' | 'add';
  value: GameValue;
}

export interface Choice {
  id: string;
  text: string;
  next: string;
  conditions?: Condition[];
  effects?: Effect[];
}

export interface Line {
  speaker: string | null;
  text: string;
}

export interface Scene {
  id: string;
  title?: string;
  lines: Line[];
  choices: Choice[];
  next?: string;
  ending?: boolean;
}

export interface Game {
  id: string;
  title: string;
  startScene: string;
  initialState: GameState;
}

export interface Manifest {
  game: string;
  characters: string;
  scenes: string[];
  ui?: string;
}

export interface UiCopy {
  choicePrompt: string;
  continueLabel: string;
  restartLabel: string;
  narratorName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== 'string') throw new Error(`${key} 必須是字串`);
  return value[key];
}

function asGameValue(value: unknown, label: string): GameValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  throw new Error(`${label} 必須是 string / number / boolean`);
}

export function parseManifest(raw: unknown): Manifest {
  if (!isRecord(raw)) throw new Error('manifest 必須是物件');
  if (!Array.isArray(raw.scenes) || !raw.scenes.every((item) => typeof item === 'string')) {
    throw new Error('manifest.scenes 必須是字串陣列');
  }
  return {
    game: stringField(raw, 'game'),
    characters: stringField(raw, 'characters'),
    scenes: raw.scenes,
    ui: typeof raw.ui === 'string' ? raw.ui : undefined,
  };
}

export function parseGame(raw: unknown): Game {
  if (!isRecord(raw) || !isRecord(raw.initialState)) throw new Error('game 格式錯誤');
  const initialState: GameState = {};
  for (const [key, value] of Object.entries(raw.initialState)) initialState[key] = asGameValue(value, `initialState.${key}`);
  return { id: stringField(raw, 'id'), title: stringField(raw, 'title'), startScene: stringField(raw, 'startScene'), initialState };
}

export function parseCharacters(raw: unknown): Character[] {
  if (!Array.isArray(raw)) throw new Error('characters 必須是陣列');
  return raw.map((item) => {
    if (!isRecord(item)) throw new Error('character 格式錯誤');
    return {
      id: stringField(item, 'id'),
      displayName: stringField(item, 'displayName'),
      role: typeof item.role === 'string' ? item.role : undefined,
      avatar: typeof item.avatar === 'string' ? item.avatar : undefined,
    };
  });
}

function parseChoice(raw: unknown): Choice {
  if (!isRecord(raw)) throw new Error('choice 格式錯誤');
  const conditions: Condition[] | undefined = Array.isArray(raw.conditions)
    ? raw.conditions.map((condition) => {
        if (!isRecord(condition)) throw new Error('condition 格式錯誤');
        const operator = stringField(condition, 'operator');
        if (!['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(operator)) throw new Error(`未知 operator: ${operator}`);
        return {
          variable: stringField(condition, 'variable'),
          operator: operator as Condition['operator'],
          value: asGameValue(condition.value, 'condition.value'),
        };
      })
    : undefined;
  const effects: Effect[] | undefined = Array.isArray(raw.effects)
    ? raw.effects.map((effect) => {
        if (!isRecord(effect)) throw new Error('effect 格式錯誤');
        const operation = stringField(effect, 'operation');
        if (operation !== 'set' && operation !== 'add') throw new Error(`未知 operation: ${operation}`);
        return {
          variable: stringField(effect, 'variable'),
          operation,
          value: asGameValue(effect.value, 'effect.value'),
        };
      })
    : undefined;
  return {
    id: stringField(raw, 'id'),
    text: stringField(raw, 'text'),
    next: stringField(raw, 'next'),
    conditions,
    effects,
  };
}

export function parseScene(raw: unknown): Scene {
  if (!isRecord(raw) || !Array.isArray(raw.lines)) throw new Error('scene 格式錯誤');
  const lines = raw.lines.map((line) => {
    if (!isRecord(line)) throw new Error('line 格式錯誤');
    if (line.speaker !== null && typeof line.speaker !== 'string') throw new Error('line.speaker 格式錯誤');
    return { speaker: line.speaker as string | null, text: stringField(line, 'text') };
  });
  return {
    id: stringField(raw, 'id'),
    title: typeof raw.title === 'string' ? raw.title : undefined,
    lines,
    choices: Array.isArray(raw.choices) ? raw.choices.map(parseChoice) : [],
    next: typeof raw.next === 'string' ? raw.next : undefined,
    ending: typeof raw.ending === 'boolean' ? raw.ending : undefined,
  };
}

export function parseUi(raw: unknown): UiCopy {
  const value = isRecord(raw) ? raw : {};
  return {
    choicePrompt: typeof value.choicePrompt === 'string' ? value.choicePrompt : '請選擇：',
    continueLabel: typeof value.continueLabel === 'string' ? value.continueLabel : '繼續',
    restartLabel: typeof value.restartLabel === 'string' ? value.restartLabel : '重新開始',
    narratorName: typeof value.narratorName === 'string' ? value.narratorName : '旁白',
  };
}
