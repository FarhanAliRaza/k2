/**
 * Effect System - Reactive side effects built on TC39 Signals
 */

import { Computed, Watcher } from './signals';

let needsEnqueue = true;
let pendingEffects: Set<Computed<void>> = new Set();

const watcher = new Watcher(() => {
  if (needsEnqueue) {
    needsEnqueue = false;
    queueMicrotask(processPending);
  }
});

function processPending(): void {
  needsEnqueue = true;
  // Reset watcher dirty flag so nested signal changes can queue new microtasks
  watcher.watch();

  for (const computed of watcher.getPending()) {
    computed.get();
  }

  watcher.watch();
}

export type CleanupFn = () => void;
export type EffectFn = () => CleanupFn | void;

export function effect(callback: EffectFn): () => void {
  let cleanup: CleanupFn | void;

  const computed = new Computed<void>(() => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
    cleanup = callback();
  });

  watcher.watch(computed);
  computed.get(); // Run immediately

  return () => {
    watcher.unwatch(computed);
    if (typeof cleanup === 'function') {
      cleanup();
    }
  };
}

export function batch(fn: () => void): void {
  // Simple batch - just run the function
  // The effect system already batches via microtask
  fn();
}
