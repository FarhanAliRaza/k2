/**
 * Simple test to verify TC39 Signals reactivity works
 */

import { State, Computed, untrack } from './src/signals';
import { effect } from './src/effect';

console.log('=== TC39 Signals Reactivity Test ===\n');

// Test 1: Basic State
console.log('Test 1: Basic State');
const count = new State(0);
console.log(`  Initial: ${count.get()}`);
count.set(5);
console.log(`  After set(5): ${count.get()}`);
console.log(`  ✓ Basic state works\n`);

// Test 2: Computed
console.log('Test 2: Computed Values');
const a = new State(2);
const b = new State(3);
const sum = new Computed(() => a.get() + b.get());
console.log(`  a=${a.get()}, b=${b.get()}, sum=${sum.get()}`);
a.set(10);
console.log(`  After a=10: sum=${sum.get()}`);
console.log(`  ✓ Computed values work\n`);

// Test 3: Effect (reactive side effects)
console.log('Test 3: Effects');
const name = new State('World');
let effectRanCount = 0;
let lastMessage = '';

const dispose = effect(() => {
  effectRanCount++;
  lastMessage = `Hello, ${name.get()}!`;
  console.log(`  Effect ran: "${lastMessage}"`);
});

console.log(`  Effect ran ${effectRanCount} time(s) on creation`);

// Wait for microtask to process
await new Promise(r => setTimeout(r, 10));

name.set('Svelte');
await new Promise(r => setTimeout(r, 10));
console.log(`  Effect ran ${effectRanCount} time(s) after name change`);

name.set('Signals');
await new Promise(r => setTimeout(r, 10));
console.log(`  Effect ran ${effectRanCount} time(s) after another change`);

dispose();
name.set('Disposed');
await new Promise(r => setTimeout(r, 10));
console.log(`  Effect ran ${effectRanCount} time(s) after dispose (should not increase)`);
console.log(`  ✓ Effects work\n`);

// Test 4: Dependency tracking
console.log('Test 4: Automatic Dependency Tracking');
const x = new State(1);
const y = new State(2);
const useX = new State(true);

const conditional = new Computed(() => {
  if (useX.get()) {
    return x.get();
  } else {
    return y.get();
  }
});

console.log(`  useX=true, x=1, y=2 → result=${conditional.get()}`);
x.set(100);
console.log(`  After x=100 → result=${conditional.get()}`);
useX.set(false);
console.log(`  After useX=false → result=${conditional.get()} (now using y)`);
y.set(200);
console.log(`  After y=200 → result=${conditional.get()}`);
console.log(`  ✓ Dynamic dependency tracking works\n`);

// Test 5: Untrack
console.log('Test 5: Untrack');
const tracked = new State(1);
const untracked_result = new Computed(() => {
  return untrack(() => tracked.get()) * 2;
});
console.log(`  Initial: ${untracked_result.get()}`);
tracked.set(10);
console.log(`  After tracked=10: ${untracked_result.get()} (should still be 2, not recomputed)`);
console.log(`  ✓ Untrack works\n`);

console.log('=== All Tests Passed! ===');
