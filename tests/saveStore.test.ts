import { describe, expect, it } from 'vitest';
import { SaveStore, SAVE_FORMAT_VERSION, type StorageLike } from '../src/data/saveStore';
import type { StorySnapshot } from '../src/engine/StoryEngine';

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  raw(key: string): string | undefined {
    return this.map.get(key);
  }
}

const snapshot: StorySnapshot = { sceneId: 'feedback', state: { trust: 2, clarity: 1, mood: 'calm', done: false } };

describe('SaveStore', () => {
  it('round-trips a snapshot', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('game-a', storage);
    expect(store.has()).toBe(false);
    expect(store.save(snapshot)).toBe(true);
    expect(store.has()).toBe(true);
    expect(store.load()).toEqual(snapshot);
  });

  it('clears a saved snapshot', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('game-a', storage);
    store.save(snapshot);
    store.clear();
    expect(store.load()).toBeNull();
    expect(store.has()).toBe(false);
  });

  it('ignores saves belonging to a different game', () => {
    const storage = new MemoryStorage();
    new SaveStore('game-a', storage).save(snapshot);
    const other = new SaveStore('game-b', storage);
    expect(other.load()).toBeNull();
  });

  it('discards an incompatible save version', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('game-a', storage, 'k');
    storage.setItem('k', JSON.stringify({ version: SAVE_FORMAT_VERSION + 1, gameId: 'game-a', snapshot }));
    expect(store.load()).toBeNull();
    // 壞資料應被清除
    expect(storage.raw('k')).toBeUndefined();
  });

  it('discards corrupt json and self-heals', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('game-a', storage, 'k');
    storage.setItem('k', '{not valid json');
    expect(store.load()).toBeNull();
    expect(storage.raw('k')).toBeUndefined();
  });

  it('rejects a snapshot with a non-primitive state value', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('game-a', storage, 'k');
    storage.setItem(
      'k',
      JSON.stringify({ version: SAVE_FORMAT_VERSION, gameId: 'game-a', snapshot: { sceneId: 'x', state: { bad: { nested: 1 } } } }),
    );
    expect(store.load()).toBeNull();
  });

  it('degrades safely when no storage is available', () => {
    const store = new SaveStore('game-a', null);
    expect(store.save(snapshot)).toBe(false);
    expect(store.load()).toBeNull();
    expect(store.has()).toBe(false);
    expect(() => store.clear()).not.toThrow();
  });

  it('returns false when the storage backend throws on write', () => {
    const flaky: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {},
    };
    const store = new SaveStore('game-a', flaky);
    expect(store.save(snapshot)).toBe(false);
  });
});

describe('SaveStore lineIndex', () => {
  it('round-trips lineIndex and drops an invalid one instead of rejecting the save', () => {
    const memory = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => { memory.set(key, value); },
      removeItem: (key) => { memory.delete(key); },
    };
    const store = new SaveStore('game-a', storage);
    store.save({ sceneId: 's3-meeting', state: { trust: 1 }, lineIndex: 7 });
    expect(store.load()).toEqual({ sceneId: 's3-meeting', state: { trust: 1 }, lineIndex: 7 });
    memory.set('ecg:save:game-a', JSON.stringify({ version: SAVE_FORMAT_VERSION, gameId: 'game-a', updatedAt: 'x', snapshot: { sceneId: 's1', state: {}, lineIndex: -3 } }));
    expect(store.load()).toEqual({ sceneId: 's1', state: {} });
  });
});

describe('已看過的過場影片', () => {
  it('存檔會帶著 watchedCutscenes 來回', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('g', storage);
    store.save({ sceneId: 's4-notice', state: {}, lineIndex: 2, watchedCutscenes: ['layoff-notification'] });
    expect(store.load()?.watchedCutscenes).toEqual(['layoff-notification']);
  });

  it('舊存檔沒有這個欄位時照常讀取', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('g', storage);
    store.save({ sceneId: 's4-notice', state: {} });
    const loaded = store.load();
    expect(loaded?.sceneId).toBe('s4-notice');
    expect(loaded?.watchedCutscenes).toBeUndefined();
  });

  it('欄位型別不對時忽略該欄位，不丟掉整份存檔', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('g', storage);
    store.save({ sceneId: 's4-notice', state: {}, watchedCutscenes: ['ok', 7 as unknown as string] });
    const loaded = store.load();
    expect(loaded?.sceneId).toBe('s4-notice');
    expect(loaded?.watchedCutscenes).toBeUndefined();
  });
});

describe('決策點紀錄', () => {
  const decisions = [
    { sceneId: 's2-invite', lineIndex: 2, state: { boundary: 0 }, choiceId: 'invite-clear' },
    { sceneId: 's3-meeting', lineIndex: 26, state: { boundary: 1 }, choiceId: 'notice-direct' },
  ];

  it('存檔會帶著 decisions 來回，通關後重新載入仍回得到決策點', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('g', storage);
    store.save({ sceneId: 'ending-true', state: { boundary: 3 }, lineIndex: 0, decisions });
    expect(store.load()?.decisions).toEqual(decisions);
  });

  it('舊存檔沒有這個欄位時照常讀取', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('g', storage);
    store.save({ sceneId: 'ending-true', state: {} });
    const loaded = store.load();
    expect(loaded?.sceneId).toBe('ending-true');
    expect(loaded?.decisions).toBeUndefined();
  });

  it('任何一筆壞掉就整個欄位忽略（索引不能錯位），但存檔本身仍可用', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore('g', storage);
    store.save({
      sceneId: 'ending-true',
      state: { boundary: 3 },
      lineIndex: 4,
      decisions: [decisions[0], { ...decisions[1], lineIndex: -1 }],
    });
    const loaded = store.load();
    expect(loaded?.sceneId).toBe('ending-true');
    expect(loaded?.lineIndex).toBe(4);
    expect(loaded?.decisions).toBeUndefined();
  });
});
