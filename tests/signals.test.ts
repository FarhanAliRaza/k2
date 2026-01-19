import { describe, it, expect, vi } from 'vitest';
import { State, Computed, untrack } from '../src/signals';
import { effect } from '../src/effect';

describe('State', () => {
  it('should store and retrieve a value', () => {
    const count = new State(0);
    expect(count.get()).toBe(0);
  });

  it('should update value with set()', () => {
    const count = new State(0);
    count.set(5);
    expect(count.get()).toBe(5);
  });

  it('should work with different types', () => {
    const str = new State('hello');
    expect(str.get()).toBe('hello');
    str.set('world');
    expect(str.get()).toBe('world');

    const obj = new State({ a: 1 });
    expect(obj.get()).toEqual({ a: 1 });
    obj.set({ a: 2 });
    expect(obj.get()).toEqual({ a: 2 });

    const arr = new State([1, 2, 3]);
    expect(arr.get()).toEqual([1, 2, 3]);
  });

  it('should support custom equality function', async () => {
    const count = new State(0, {
      equals: (a, b) => Math.abs(a - b) < 0.001,
    });

    let effectRuns = 0;
    effect(() => {
      count.get();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    count.set(0.0001); // Should not trigger (within tolerance)
    await Promise.resolve();
    expect(effectRuns).toBe(1);
    count.set(1); // Should trigger
    await Promise.resolve();
    expect(effectRuns).toBe(2);
  });
});

describe('Computed', () => {
  it('should compute derived values', () => {
    const a = new State(2);
    const b = new State(3);
    const sum = new Computed(() => a.get() + b.get());

    expect(sum.get()).toBe(5);
  });

  it('should update when dependencies change', () => {
    const count = new State(1);
    const doubled = new Computed(() => count.get() * 2);

    expect(doubled.get()).toBe(2);
    count.set(5);
    expect(doubled.get()).toBe(10);
  });

  it('should support chained computeds', () => {
    const a = new State(1);
    const b = new Computed(() => a.get() * 2);
    const c = new Computed(() => b.get() + 1);

    expect(c.get()).toBe(3);
    a.set(5);
    expect(c.get()).toBe(11);
  });

  it('should memoize computed values', () => {
    let computeCount = 0;
    const a = new State(1);
    const expensive = new Computed(() => {
      computeCount++;
      return a.get() * 2;
    });

    expect(expensive.get()).toBe(2);
    expect(computeCount).toBe(1);

    // Same value, should not recompute
    expensive.get();
    expensive.get();
    expect(computeCount).toBe(1);

    // Change dependency, should recompute
    a.set(2);
    expect(expensive.get()).toBe(4);
    expect(computeCount).toBe(2);
  });

  it('should detect cycles and throw', () => {
    const a: Computed<number> = new Computed(() => a.get() + 1);
    expect(() => a.get()).toThrow('Cycle');
  });

  it('should propagate errors', () => {
    const willThrow = new Computed(() => {
      throw new Error('test error');
    });

    expect(() => willThrow.get()).toThrow('test error');
  });
});

describe('effect', () => {
  it('should run immediately', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should re-run when dependencies change', async () => {
    const count = new State(0);
    const fn = vi.fn();

    effect(() => {
      count.get();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    count.set(1);
    await Promise.resolve(); // Wait for microtask

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track multiple dependencies', async () => {
    const a = new State(1);
    const b = new State(2);
    const values: number[] = [];

    effect(() => {
      values.push(a.get() + b.get());
    });

    expect(values).toEqual([3]);

    a.set(10);
    await Promise.resolve();
    expect(values).toEqual([3, 12]);

    b.set(20);
    await Promise.resolve();
    expect(values).toEqual([3, 12, 30]);
  });

  it('should clean up when disposed', async () => {
    const count = new State(0);
    const fn = vi.fn();

    const dispose = effect(() => {
      count.get();
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);

    dispose();
    count.set(1);
    await Promise.resolve();

    expect(fn).toHaveBeenCalledTimes(1); // Should not run again
  });

  it('should call cleanup function', async () => {
    const count = new State(0);
    const cleanup = vi.fn();

    effect(() => {
      count.get();
      return cleanup;
    });

    expect(cleanup).not.toHaveBeenCalled();

    count.set(1);
    await Promise.resolve();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('untrack', () => {
  it('should not track reads inside untrack', async () => {
    const a = new State(1);
    const b = new State(2);
    const fn = vi.fn();

    effect(() => {
      fn();
      a.get();
      untrack(() => b.get());
    });

    expect(fn).toHaveBeenCalledTimes(1);

    // Changing a should re-run
    a.set(10);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);

    // Changing b should NOT re-run
    b.set(20);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should return the value from the callback', () => {
    const count = new State(5);
    const result = untrack(() => count.get() * 2);
    expect(result).toBe(10);
  });
});
