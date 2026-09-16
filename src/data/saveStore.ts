import type { GameState, GameValue } from '../domain/schema';
import type { StorySnapshot } from '../engine/StoryEngine';

/**
 * 只依賴 Web Storage 介面的最小子集，方便在測試中注入記憶體實作，
 * 也讓引擎邏輯與瀏覽器 API 解耦。
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 存檔格式版本。結構變動時遞增，讓不相容的舊存檔被安全丟棄。 */
export const SAVE_FORMAT_VERSION = 1;

interface SaveEnvelope {
  version: number;
  gameId: string;
  updatedAt: string;
  snapshot: StorySnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGameValue(value: unknown): value is GameValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function parseGameState(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null;
  const state: GameState = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isGameValue(value)) return null;
    state[key] = value;
  }
  return state;
}

/**
 * 驗證從儲存讀回的信封。任何欄位不符（版本、遊戲 ID、快照結構）都回傳 null，
 * 由呼叫端當成「沒有可用存檔」處理，而不是讓壞資料流進引擎。
 */
function parseEnvelope(raw: unknown, gameId: string): StorySnapshot | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== SAVE_FORMAT_VERSION) return null;
  if (raw.gameId !== gameId) return null;
  if (!isRecord(raw.snapshot)) return null;
  if (typeof raw.snapshot.sceneId !== 'string') return null;
  const state = parseGameState(raw.snapshot.state);
  if (!state) return null;
  // lineIndex 為選填（版本 1 早期存檔沒有）；非法值直接忽略而不是整份丟棄。
  const rawIndex = raw.snapshot.lineIndex;
  const lineIndex = typeof rawIndex === 'number' && Number.isInteger(rawIndex) && rawIndex >= 0 ? rawIndex : undefined;
  return lineIndex === undefined ? { sceneId: raw.snapshot.sceneId, state } : { sceneId: raw.snapshot.sceneId, state, lineIndex };
}

/** 解析瀏覽器 localStorage；在無法存取（SSR、隱私模式）時回傳 null。 */
function resolveStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

/**
 * 單一遊戲存檔的持久化層。所有 Storage 存取都包在 try/catch 中，
 * 因此在隱私模式、配額用盡或無 Storage 環境下都不會讓遊戲崩潰。
 */
export class SaveStore {
  private readonly key: string;

  constructor(
    private readonly gameId: string,
    private readonly storage: StorageLike | null = resolveStorage(),
    key?: string,
  ) {
    this.key = key ?? `ecg:save:${gameId}`;
  }

  /** 儲存快照。成功回傳 true；沒有可用 Storage 或寫入失敗則回傳 false。 */
  save(snapshot: StorySnapshot): boolean {
    if (!this.storage) return false;
    const envelope: SaveEnvelope = {
      version: SAVE_FORMAT_VERSION,
      gameId: this.gameId,
      updatedAt: new Date().toISOString(),
      snapshot,
    };
    try {
      this.storage.setItem(this.key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  /** 讀取快照；沒有存檔、資料損壞或版本不符時回傳 null（並清除壞資料）。 */
  load(): StorySnapshot | null {
    if (!this.storage) return null;
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.clear();
      return null;
    }

    const snapshot = parseEnvelope(parsed, this.gameId);
    if (!snapshot) {
      this.clear();
      return null;
    }
    return snapshot;
  }

  /** 是否存在可用存檔。 */
  has(): boolean {
    return this.load() !== null;
  }

  /** 清除存檔。 */
  clear(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* 清除失敗不影響遊戲流程 */
    }
  }
}
