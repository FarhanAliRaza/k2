# K2

**Ultra-fast Alpine.js alternative powered by TC39 Signals**

[![npm version](https://img.shields.io/npm/v/@farhanaliraza/k2-js.svg)](https://www.npmjs.com/package/@farhanaliraza/k2-js)
[![gzip size](https://img.shields.io/badge/gzip-3.6KB-brightgreen)](https://bundlephobia.com/package/@farhanaliraza/k2-js)
[![license](https://img.shields.io/npm/l/@farhanaliraza/k2-js.svg)](https://github.com/FarhanAliRaza/k2/blob/main/LICENSE)

K2 is a lightweight reactive framework that brings Alpine.js-style declarative HTML with the performance of TC39 Signals. At just **3.6KB gzipped**, it's ~4.7x smaller than Alpine.js and ~1.7x smaller than Petite-Vue.

## Features

- **Tiny**: 3.6KB gzipped (vs Alpine.js 17KB, Petite-Vue 6KB)
- **Fast**: Built on TC39 Signals for fine-grained reactivity
- **Familiar**: Alpine.js-compatible directive syntax
- **Zero dependencies**: No runtime dependencies
- **TypeScript**: Full TypeScript support

## Installation

### CDN

```html
<!-- unpkg -->
<script src="https://unpkg.com/@farhanaliraza/k2-js"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@farhanaliraza/k2-js"></script>
```

### npm

```bash
npm install @farhanaliraza/k2-js
# or
pnpm add @farhanaliraza/k2-js
```

```js
import K2 from '@farhanaliraza/k2-js';
```

## Quick Start

```html
<div x-data="{ count: 0 }">
  <span x-text="count"></span>
  <button @click="count++">+</button>
</div>

<script src="https://unpkg.com/@farhanaliraza/k2-js"></script>
```

K2 auto-initializes when the DOM is ready. For manual control:

```js
K2.init(); // Initialize all x-data components
K2.init(myElement); // Initialize within a specific element
```

## Directives

### x-data

Define reactive state for a component:

```html
<div x-data="{ count: 0, name: 'John' }">
  <!-- Component content -->
</div>
```

### x-text

Set element text content:

```html
<span x-text="count"></span>
<span x-text="'Hello, ' + name"></span>
```

### x-html

Set element inner HTML:

```html
<div x-html="htmlContent"></div>
```

### x-show

Toggle element visibility:

```html
<div x-show="isVisible">Shown when isVisible is true</div>
```

### x-bind / :attr

Bind attributes dynamically:

```html
<a x-bind:href="url">Link</a>
<a :href="url">Shorthand</a>

<!-- Class object syntax -->
<div :class="{ active: isActive, disabled: isDisabled }"></div>

<!-- Style object syntax -->
<div :style="{ color: textColor, fontSize: size + 'px' }"></div>
```

### x-model

Two-way data binding for inputs:

```html
<input x-model="name" type="text">
<input x-model="agreed" type="checkbox">
<input x-model="count" type="number">
<select x-model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

### x-on / @event

Handle events:

```html
<button x-on:click="count++">Click</button>
<button @click="count++">Shorthand</button>

<!-- With $event -->
<input @input="name = $event.target.value">

<!-- Modifiers -->
<form @submit.prevent="handleSubmit">...</form>
<button @click.stop="handleClick">Click</button>
<div @click.self="onClick">Only direct clicks</div>
<button @click.once="runOnce">Once</button>

<!-- Key modifiers -->
<input @keydown.enter="submit">
<input @keydown.escape="cancel">
```

## Computed Properties

Define computed values as arrow functions in x-data:

```html
<div x-data="{
  a: 5,
  b: 3,
  sum: () => a + b,
  product: () => a * b
}">
  <span x-text="sum"></span>
  <span x-text="product"></span>
</div>
```

## Programmatic API

K2 exports its signal primitives for advanced use:

```js
import { State, Computed, effect, untrack } from '@farhanaliraza/k2-js';

// Create reactive state
const count = new State(0);
console.log(count.get()); // 0
count.set(5);

// Create computed values
const doubled = new Computed(() => count.get() * 2);
console.log(doubled.get()); // 10

// Create effects (auto-run when dependencies change)
const dispose = effect(() => {
  console.log('Count is:', count.get());
});

// Stop tracking inside untrack
untrack(() => {
  count.get(); // Not tracked
});

// Cleanup
dispose();
```

## Benchmarks

K2 outperforms Alpine.js across all benchmarks:

| Benchmark | K2 | Alpine.js | K2 Faster By |
|-----------|-----|-----------|--------------|
| Create 1,000 rows | 15ms | 85ms | 5.7x |
| Update every 10th | 2ms | 35ms | 17.5x |
| Clear 1,000 rows | 1ms | 25ms | 25x |
| Select row | 0.5ms | 15ms | 30x |

*Results vary by browser and hardware. Run `benchmarks/index.html` to test yourself.*

### Why is K2 fast?

1. **Signals vs Proxies**: K2 uses TC39 Signals which notify subscribers directly when values change. Alpine.js uses Proxies which require checking all possible dependents.

2. **Fine-grained updates**: Only the specific DOM nodes that depend on changed data are updated.

3. **Smaller bundle**: Less code to parse and execute on page load.

## Browser Support

K2 supports all modern browsers (Chrome, Firefox, Safari, Edge).

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Dev server with watch
pnpm dev

# Check bundle size
pnpm size
```

## License

MIT
