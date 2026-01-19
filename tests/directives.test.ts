import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { K2 } from '../src/index';

describe('K2 Directives', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('x-data', () => {
    it('should initialize component with data', async () => {
      container.innerHTML = `
        <div x-data="{ count: 0 }">
          <span x-text="count"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.textContent).toBe('0');
    });

    it('should support nested values', async () => {
      container.innerHTML = `
        <div x-data="{ user: { name: 'John' } }">
          <span x-text="user.name"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.textContent).toBe('John');
    });
  });

  describe('x-text', () => {
    it('should set text content', async () => {
      container.innerHTML = `
        <div x-data="{ message: 'Hello' }">
          <span x-text="message"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.textContent).toBe('Hello');
    });

    it('should update when data changes', async () => {
      container.innerHTML = `
        <div x-data="{ count: 0 }">
          <span x-text="count"></span>
          <button @click="count++">+</button>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      const button = container.querySelector('button');

      expect(span?.textContent).toBe('0');

      button?.click();
      await Promise.resolve();

      expect(span?.textContent).toBe('1');
    });

    it('should support expressions', async () => {
      container.innerHTML = `
        <div x-data="{ a: 2, b: 3 }">
          <span x-text="a + b"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.textContent).toBe('5');
    });
  });

  describe('x-html', () => {
    it('should set inner HTML', async () => {
      container.innerHTML = `
        <div x-data="{ html: '<strong>Bold</strong>' }">
          <div x-html="html"></div>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const div = container.querySelector('[x-html]');
      expect(div?.innerHTML).toBe('<strong>Bold</strong>');
    });
  });

  describe('x-show', () => {
    it('should toggle visibility', async () => {
      container.innerHTML = `
        <div x-data="{ visible: true }">
          <span x-show="visible">Visible</span>
          <button @click="visible = false">Hide</button>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span') as HTMLElement;
      const button = container.querySelector('button');

      expect(span?.style.display).not.toBe('none');

      button?.click();
      await Promise.resolve();

      expect(span?.style.display).toBe('none');
    });
  });

  describe('x-bind', () => {
    it('should bind attributes', async () => {
      container.innerHTML = `
        <div x-data="{ url: 'https://example.com' }">
          <a x-bind:href="url">Link</a>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('should support :attr shorthand', async () => {
      container.innerHTML = `
        <div x-data="{ title: 'Hello' }">
          <span :title="title">Text</span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.getAttribute('title')).toBe('Hello');
    });

    it('should handle class object syntax', async () => {
      container.innerHTML = `
        <div x-data="{ active: true, disabled: false }">
          <span :class="{ active: active, disabled: disabled }">Text</span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.classList.contains('active')).toBe(true);
      expect(span?.classList.contains('disabled')).toBe(false);
    });

    it('should remove attribute when value is false/null/undefined', async () => {
      container.innerHTML = `
        <div x-data="{ isDisabled: false }">
          <button :disabled="isDisabled">Click</button>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const button = container.querySelector('button');
      expect(button?.hasAttribute('disabled')).toBe(false);
    });

    it('should add empty attribute when value is true', async () => {
      container.innerHTML = `
        <div x-data="{ isDisabled: true }">
          <button :disabled="isDisabled">Click</button>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const button = container.querySelector('button');
      expect(button?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('x-model', () => {
    it('should two-way bind input value', async () => {
      container.innerHTML = `
        <div x-data="{ name: 'John' }">
          <input x-model="name" type="text">
          <span x-text="name"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const input = container.querySelector('input') as HTMLInputElement;
      const span = container.querySelector('span');

      expect(input?.value).toBe('John');
      expect(span?.textContent).toBe('John');

      // Simulate user input
      input.value = 'Jane';
      input.dispatchEvent(new Event('input'));
      await Promise.resolve();

      expect(span?.textContent).toBe('Jane');
    });

    it('should work with checkbox', async () => {
      container.innerHTML = `
        <div x-data="{ checked: false }">
          <input x-model="checked" type="checkbox">
          <span x-text="checked"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const input = container.querySelector('input') as HTMLInputElement;
      const span = container.querySelector('span');

      expect(input?.checked).toBe(false);
      expect(span?.textContent).toBe('false');

      // Simulate checkbox toggle
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      await Promise.resolve();

      expect(span?.textContent).toBe('true');
    });

    it('should work with number input', async () => {
      container.innerHTML = `
        <div x-data="{ count: 5 }">
          <input x-model="count" type="number">
          <span x-text="count"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const input = container.querySelector('input') as HTMLInputElement;
      const span = container.querySelector('span');

      expect(input?.value).toBe('5');

      // Simulate user input
      input.value = '10';
      input.dispatchEvent(new Event('input'));
      await Promise.resolve();

      expect(span?.textContent).toBe('10');
    });
  });

  describe('x-on / @', () => {
    it('should handle click events', async () => {
      container.innerHTML = `
        <div x-data="{ count: 0 }">
          <button @click="count++">+</button>
          <span x-text="count"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const button = container.querySelector('button');
      const span = container.querySelector('span');

      expect(span?.textContent).toBe('0');

      button?.click();
      await Promise.resolve();

      expect(span?.textContent).toBe('1');
    });

    it('should support x-on:event syntax', async () => {
      container.innerHTML = `
        <div x-data="{ count: 0 }">
          <button x-on:click="count++">+</button>
          <span x-text="count"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const button = container.querySelector('button');
      const span = container.querySelector('span');

      button?.click();
      await Promise.resolve();

      expect(span?.textContent).toBe('1');
    });

    it('should provide $event', async () => {
      container.innerHTML = `
        <div x-data="{ type: '' }">
          <button @click="type = $event.type">Click</button>
          <span x-text="type"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const button = container.querySelector('button');
      const span = container.querySelector('span');

      button?.click();
      await Promise.resolve();

      expect(span?.textContent).toBe('click');
    });

    it('should support .prevent modifier', async () => {
      let defaultPrevented = false;

      container.innerHTML = `
        <div x-data="{}">
          <form @submit.prevent=""></form>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const form = container.querySelector('form');
      form?.addEventListener('submit', (e) => {
        defaultPrevented = e.defaultPrevented;
      });

      form?.dispatchEvent(new Event('submit', { cancelable: true }));
      expect(defaultPrevented).toBe(true);
    });

    it('should support .stop modifier', async () => {
      let parentClicked = false;

      container.innerHTML = `
        <div x-data="{}">
          <div @click="() => {}">
            <button @click.stop="">Click</button>
          </div>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const parent = container.querySelector('div > div');
      const button = container.querySelector('button');

      parent?.addEventListener('click', () => {
        parentClicked = true;
      });

      button?.click();
      expect(parentClicked).toBe(false);
    });
  });

  describe('Computed properties', () => {
    it('should support computed via arrow functions', async () => {
      container.innerHTML = `
        <div x-data="{ a: 2, b: 3, product: () => a * b }">
          <span x-text="product"></span>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      expect(span?.textContent).toBe('6');
    });

    it('should update computed when dependencies change', async () => {
      container.innerHTML = `
        <div x-data="{ count: 1, doubled: () => count * 2 }">
          <span x-text="doubled"></span>
          <button @click="count++">+</button>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const span = container.querySelector('span');
      const button = container.querySelector('button');

      expect(span?.textContent).toBe('2');

      button?.click();
      await Promise.resolve();

      expect(span?.textContent).toBe('4');
    });
  });

  describe('x-for', () => {
    it('should render initial list', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, name: 'A'}, {id: 2, name: 'B'}, {id: 3, name: 'C'}] }">
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.name"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const items = container.querySelectorAll('.item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('A');
      expect(items[1].textContent).toBe('B');
      expect(items[2].textContent).toBe('C');
    });

    it('should add new items', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, name: 'A'}] }">
          <button @click="items = [...items, {id: 2, name: 'B'}]">Add</button>
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.name"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      let items = container.querySelectorAll('.item');
      expect(items.length).toBe(1);

      const button = container.querySelector('button');
      button?.click();
      await Promise.resolve();

      items = container.querySelectorAll('.item');
      expect(items.length).toBe(2);
      expect(items[1].textContent).toBe('B');
    });

    it('should remove items', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, name: 'A'}, {id: 2, name: 'B'}, {id: 3, name: 'C'}] }">
          <button @click="items = items.filter(i => i.id !== 2)">Remove B</button>
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.name"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      let items = container.querySelectorAll('.item');
      expect(items.length).toBe(3);

      const button = container.querySelector('button');
      button?.click();
      await Promise.resolve();

      items = container.querySelectorAll('.item');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toBe('A');
      expect(items[1].textContent).toBe('C');
    });

    it('should reorder items with minimal DOM operations', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, name: 'A'}, {id: 2, name: 'B'}, {id: 3, name: 'C'}] }">
          <button @click="items = [items[2], items[1], items[0]]">Reverse</button>
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.name"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      // Get initial elements
      let items = container.querySelectorAll('.item');
      const firstElement = items[0];
      const lastElement = items[2];

      const button = container.querySelector('button');
      button?.click();
      await Promise.resolve();

      // Elements should be reordered, not recreated
      items = container.querySelectorAll('.item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('C');
      expect(items[1].textContent).toBe('B');
      expect(items[2].textContent).toBe('A');

      // Verify DOM elements were moved, not recreated (same instances)
      expect(items[0]).toBe(lastElement);
      expect(items[2]).toBe(firstElement);
    });

    it('should support index in loop', async () => {
      container.innerHTML = `
        <div x-data="{ items: ['A', 'B', 'C'] }">
          <template x-for="(item, index) in items" :key="index">
            <div class="item" x-text="index + ': ' + item"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const items = container.querySelectorAll('.item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('0: A');
      expect(items[1].textContent).toBe('1: B');
      expect(items[2].textContent).toBe('2: C');
    });

    it('should work without :key (fallback to index)', async () => {
      container.innerHTML = `
        <div x-data="{ items: ['A', 'B', 'C'] }">
          <template x-for="item in items">
            <div class="item" x-text="item"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const items = container.querySelectorAll('.item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('A');
      expect(items[1].textContent).toBe('B');
      expect(items[2].textContent).toBe('C');
    });

    it('should update item data reactively', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, value: 'A'}] }">
          <button @click="items = [{id: 1, value: 'B'}]">Update</button>
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.value"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await new Promise(r => setTimeout(r, 0));

      let items = container.querySelectorAll('.item');
      expect(items[0].textContent).toBe('A');

      const button = container.querySelector('button');
      button?.click();
      await new Promise(r => setTimeout(r, 0));

      items = container.querySelectorAll('.item');
      expect(items[0].textContent).toBe('B');
    });

    it('should support x-bind inside x-for', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, active: true}, {id: 2, active: false}] }">
          <template x-for="item in items" :key="item.id">
            <div class="item" :class="{ active: item.active }"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      const items = container.querySelectorAll('.item');
      expect(items[0].classList.contains('active')).toBe(true);
      expect(items[1].classList.contains('active')).toBe(false);
    });

    it('should clear all items', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, name: 'A'}, {id: 2, name: 'B'}] }">
          <button @click="items = []">Clear</button>
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.name"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      let items = container.querySelectorAll('.item');
      expect(items.length).toBe(2);

      const button = container.querySelector('button');
      button?.click();
      await Promise.resolve();

      items = container.querySelectorAll('.item');
      expect(items.length).toBe(0);
    });

    it('should swap rows efficiently', async () => {
      container.innerHTML = `
        <div x-data="{ items: [{id: 1, name: 'A'}, {id: 2, name: 'B'}, {id: 3, name: 'C'}] }">
          <button @click="items = [items[0], items[2], items[1]]">Swap B and C</button>
          <template x-for="item in items" :key="item.id">
            <div class="item" x-text="item.name"></div>
          </template>
        </div>
      `;

      K2.init(container);
      await Promise.resolve();

      // Get initial elements
      let items = container.querySelectorAll('.item');
      const elementB = items[1];
      const elementC = items[2];

      const button = container.querySelector('button');
      button?.click();
      await Promise.resolve();

      // Elements should be swapped, not recreated
      items = container.querySelectorAll('.item');
      expect(items[1].textContent).toBe('C');
      expect(items[2].textContent).toBe('B');

      // Verify DOM elements are the same instances (moved, not recreated)
      expect(items[1]).toBe(elementC);
      expect(items[2]).toBe(elementB);
    });
  });
});
