import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readLearningTrail, TRAIL_STORAGE_KEY } from './trailStorage';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

describe('trail local persistence', () => {
  let localStorage: MemoryStorage;

  beforeEach(() => {
    localStorage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('migrates a legacy lesson trail into scheduled sessions', () => {
    localStorage.setItem(TRAIL_STORAGE_KEY, JSON.stringify({ userId: 'old-user', items: [{ lessonId: 'l1', order: 1, reason: 'Legado' }] }));
    const result = readLearningTrail();
    expect(result.migrated).toBe(true);
    expect(result.data?.formatVersion).toBe(3);
    expect(result.data?.items[0].durationMin).toBe(5);
    expect(result.data?.availability.minutesPerSession).toBe(30);
  });

  it('reports invalid data without overwriting the original value', () => {
    localStorage.setItem(TRAIL_STORAGE_KEY, '{not-json');
    const result = readLearningTrail();
    expect(result).toEqual({ data: null, error: 'invalid' });
    expect(localStorage.getItem(TRAIL_STORAGE_KEY)).toBe('{not-json');
  });
});
