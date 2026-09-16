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
