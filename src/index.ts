/**
 * K2 - An Alpine.js-like framework powered by TC39 Signals
 *
 * Usage:
 * <div x-data="{ count: 0 }">
 *   <span x-text="count"></span>
 *   <button @click="count++">+</button>
 * </div>
 */

import { State, Computed, untrack } from './signals';
import { effect } from './effect';

export { State, Computed, untrack } from './signals';
export { effect } from './effect';

type SignalStore = Record<string, State<unknown>>;
type ComputedStore = Record<string, Computed<unknown>>;

interface ComponentScope {
  signals: SignalStore;
  computeds: ComputedStore;
  el: Element;
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}

const DIRECTIVES = {
  DATA: 'x-data',
  TEXT: 'x-text',
  HTML: 'x-html',
  SHOW: 'x-show',
  BIND: 'x-bind',
  MODEL: 'x-model',
  ON: 'x-on',
  IF: 'x-if',
  FOR: 'x-for',
  REF: 'x-ref',
} as const;

// Store active scopes
const scopes = new WeakMap<Element, ComponentScope>();

function createScopeFromString(el: Element, dataStr: string): ComponentScope {
  const signals: SignalStore = {};
  const computeds: ComputedStore = {};

  // Create scope object first
  const scope: ComponentScope = {
    signals,
    computeds,
    el,
    get(key: string): unknown {
      if (key in signals) {
        return signals[key].get();
      }
      if (key in computeds) {
        return computeds[key].get();
      }
      return undefined;
    },
    set(key: string, value: unknown): void {
      if (key in signals) {
        signals[key].set(value);
      }
    },
  };

  // Parse the data string to find functions vs values
  const tempData = new Function(`return (${dataStr})`)();

  // First pass: create signals for non-functions
  for (const [key, value] of Object.entries(tempData)) {
    if (typeof value !== 'function') {
      signals[key] = new State(value);
    }
  }

  // Capture signal keys at this point (before computeds are added)
  const signalKeys = Object.keys(signals);

  // Helper to build evaluation code - uses only signal keys (not computeds)
  // to avoid circular dependencies
  const buildEvalCode = (bodyExpr: string): string => {
    const getterCode = signalKeys.map(k => `get ${k}() { return s.get('${k}'); }`).join(',');
    const setterCode = signalKeys.map(k => `set ${k}(v) { s.set('${k}', v); }`).join(',');
    return `with({${getterCode}${setterCode ? ',' + setterCode : ''}}){return(${bodyExpr})}`;
  };

  // Second pass: create computeds for functions
  for (const [key, value] of Object.entries(tempData)) {
    if (typeof value === 'function') {
      const fnStr = (value as () => unknown).toString();

      // Extract the function body
      let bodyExpr: string;

      if (fnStr.includes('=>')) {
        // Arrow function
        const arrowIndex = fnStr.indexOf('=>');
        bodyExpr = fnStr.slice(arrowIndex + 2).trim();
        // Remove surrounding braces if present and it's a block
        if (bodyExpr.startsWith('{') && bodyExpr.endsWith('}')) {
          bodyExpr = bodyExpr.slice(1, -1).trim();
          if (!bodyExpr.includes('return')) {
            bodyExpr = `return (${bodyExpr})`;
          }
        }
      } else {
        // Regular function - extract body
        const bodyMatch = fnStr.match(/\{([\s\S]*)\}/);
        bodyExpr = bodyMatch ? bodyMatch[1].trim() : 'undefined';
      }

      // Pre-build the evaluation function once (not on every access)
      const evalCode = buildEvalCode(bodyExpr);
      const evalFn = new Function('s', evalCode);

      computeds[key] = new Computed(() => {
        try {
          return evalFn(scope);
        } catch (e) {
          console.error(`Error in computed "${key}":`, e);
          return undefined;
        }
      });
    }
  }

  scopes.set(el, scope);
  return scope;
}

function findScope(el: Element): ComponentScope | undefined {
  let current: Element | null = el;
  while (current) {
    const scope = scopes.get(current);
    if (scope) return scope;
    current = current.parentElement;
  }
  return undefined;
}

// Build with-context code for expressions
function buildWithCode(scope: ComponentScope): string {
  const keys = [...Object.keys(scope.signals), ...Object.keys(scope.computeds)];
  const g = keys.map(k => `get ${k}(){return s.get('${k}')}`).join(',');
  const t = Object.keys(scope.signals).map(k => `set ${k}(v){s.set('${k}',v)}`).join(',');
  return `with({${g}${t ? ',' + t : ''}})`;
}

function evaluateExpression(expr: string, scope: ComponentScope): unknown {
  try {
    return new Function('s', `${buildWithCode(scope)}{return(${expr})}`)(scope);
  } catch (e) {
    console.error(`Error evaluating: ${expr}`, e);
    return undefined;
  }
}

function executeStatement(stmt: string, scope: ComponentScope, event?: Event): void {
  try {
    new Function('s', '$event', `${buildWithCode(scope)}{${stmt}}`)(scope, event);
  } catch (e) {
    console.error(`Error executing: ${stmt}`, e);
  }
}

function processTextDirective(el: Element, expr: string, scope: ComponentScope): void {
  effect(() => {
    const value = evaluateExpression(expr, scope);
    el.textContent = String(value ?? '');
  });
}

function processHtmlDirective(el: Element, expr: string, scope: ComponentScope): void {
  effect(() => {
    const value = evaluateExpression(expr, scope);
    el.innerHTML = String(value ?? '');
  });
}

function processShowDirective(el: HTMLElement, expr: string, scope: ComponentScope): void {
  const originalDisplay = el.style.display || '';

  effect(() => {
    const value = evaluateExpression(expr, scope);
    el.style.display = value ? originalDisplay : 'none';
  });
}

function processBindDirective(el: Element, attr: string, expr: string, scope: ComponentScope): void {
  effect(() => {
    const value = evaluateExpression(expr, scope);

    if (attr === 'class') {
      if (typeof value === 'object' && value !== null) {
        // Object syntax: { 'class-name': boolean }
        for (const [className, enabled] of Object.entries(value)) {
          el.classList.toggle(className, Boolean(enabled));
        }
      } else {
        el.setAttribute('class', String(value ?? ''));
      }
    } else if (attr === 'style') {
      if (typeof value === 'object' && value !== null) {
        // Object syntax: { property: value }
        for (const [prop, val] of Object.entries(value)) {
          (el as HTMLElement).style.setProperty(prop, String(val ?? ''));
        }
      } else {
        el.setAttribute('style', String(value ?? ''));
      }
    } else if (value === null || value === undefined || value === false) {
      el.removeAttribute(attr);
    } else if (value === true) {
      el.setAttribute(attr, '');
    } else {
      el.setAttribute(attr, String(value));
    }
  });
}

function processModelDirective(el: Element, expr: string, scope: ComponentScope): void {
  const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  // Two-way binding
  effect(() => {
    const value = evaluateExpression(expr, scope);
    if (input.type === 'checkbox') {
      (input as HTMLInputElement).checked = Boolean(value);
    } else if (input.type === 'radio') {
      (input as HTMLInputElement).checked = input.value === String(value);
    } else {
      input.value = String(value ?? '');
    }
  });

  const eventType = input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio'
    ? 'change'
    : 'input';

  input.addEventListener(eventType, () => {
    let newValue: unknown;
    if (input.type === 'checkbox') {
      newValue = (input as HTMLInputElement).checked;
    } else if (input.type === 'number' || input.type === 'range') {
      newValue = input.valueAsNumber;
    } else {
      newValue = input.value;
    }

    // Set the value directly
    if (expr in scope.signals) {
      scope.set(expr, newValue);
    } else {
      executeStatement(`${expr} = ${JSON.stringify(newValue)}`, scope);
    }
  });
}

function processEventDirective(el: Element, eventName: string, handler: string, scope: ComponentScope): void {
  // Parse modifiers
  const parts = eventName.split('.');
  const event = parts[0];
  const modifiers = new Set(parts.slice(1));

  el.addEventListener(event, (e) => {
    if (modifiers.has('prevent')) e.preventDefault();
    if (modifiers.has('stop')) e.stopPropagation();
    if (modifiers.has('self') && e.target !== el) return;

    // Handle key modifiers for keyboard events
    if (e instanceof KeyboardEvent) {
      if (modifiers.has('enter') && e.key !== 'Enter') return;
      if (modifiers.has('escape') && e.key !== 'Escape') return;
      if (modifiers.has('space') && e.key !== ' ') return;
      if (modifiers.has('tab') && e.key !== 'Tab') return;
    }

    executeStatement(handler, scope, e);
  }, { once: modifiers.has('once'), capture: modifiers.has('capture') });
}

function processElement(el: Element, scope: ComponentScope): void {
  // Get all attributes to process
  const attributes = Array.from(el.attributes);

  for (const attr of attributes) {
    const name = attr.name;
    const value = attr.value;

    if (name === DIRECTIVES.TEXT) {
      processTextDirective(el, value, scope);
    } else if (name === DIRECTIVES.HTML) {
      processHtmlDirective(el, value, scope);
    } else if (name === DIRECTIVES.SHOW) {
      processShowDirective(el as HTMLElement, value, scope);
    } else if (name === DIRECTIVES.MODEL) {
      processModelDirective(el, value, scope);
    } else if (name.startsWith(DIRECTIVES.BIND + ':') || name.startsWith(':')) {
      // x-bind:attr or :attr shorthand
      const bindAttr = name.startsWith(':') ? name.slice(1) : name.slice(DIRECTIVES.BIND.length + 1);
      processBindDirective(el, bindAttr, value, scope);
    } else if (name.startsWith(DIRECTIVES.ON + ':') || name.startsWith('@')) {
      // x-on:event or @event shorthand
      const eventName = name.startsWith('@') ? name.slice(1) : name.slice(DIRECTIVES.ON.length + 1);
      processEventDirective(el, eventName, value, scope);
    }
  }
}

function initializeComponent(root: Element): void {
  const dataAttr = root.getAttribute(DIRECTIVES.DATA);
  if (!dataAttr) return;

  let scope: ComponentScope;
  try {
    scope = createScopeFromString(root, dataAttr);
  } catch (e) {
    console.error(`Error parsing x-data: ${dataAttr}`, e);
    return;
  }

  // Process the root element
  processElement(root, scope);

  // Process all child elements
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;

  while ((node = walker.nextNode() as Element | null)) {
    // Skip nested x-data components - they'll be initialized separately
    if (node.hasAttribute(DIRECTIVES.DATA)) {
      continue;
    }
    processElement(node, scope);
  }
}

function init(root: Element | Document = document): void {
  const components = root.querySelectorAll(`[${DIRECTIVES.DATA}]`);

  for (const component of components) {
    initializeComponent(component);
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    // DOM already loaded, initialize on next tick
    queueMicrotask(() => init());
  }
}

// Export for manual initialization
export const K2 = {
  init,
  State,
  Computed,
  effect,
  untrack,
  version: '0.1.0',
};

// Also export as default
export default K2;

// Make available globally
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).K2 = K2;
}
