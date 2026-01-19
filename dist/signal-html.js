"use strict";
var SignalHTML = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    Computed: () => Computed,
    SignalHTML: () => SignalHTML,
    State: () => State,
    default: () => index_default,
    effect: () => effect,
    untrack: () => untrack
  });

  // src/signals.ts
  var activeConsumer = null;
  var inNotificationPhase = false;
  var epoch = 1;
  var REACTIVE_NODE = {
    version: 0,
    lastCleanEpoch: 0,
    dirty: false,
    producerNode: void 0,
    producerLastReadVersion: void 0,
    producerIndexOfThis: void 0,
    nextProducerIndex: 0,
    liveConsumerNode: void 0,
    liveConsumerIndexOfThis: void 0,
    consumerAllowSignalWrites: false,
    consumerIsAlwaysLive: false,
    producerMustRecompute: () => false,
    producerRecomputeValue: () => {
    },
    consumerMarkedDirty: () => {
    }
  };
  function setActiveConsumer(consumer) {
    const prev = activeConsumer;
    activeConsumer = consumer;
    return prev;
  }
  function isInNotificationPhase() {
    return inNotificationPhase;
  }
  function assertConsumerNode(node) {
    node.producerNode ??= [];
    node.producerIndexOfThis ??= [];
    node.producerLastReadVersion ??= [];
  }
  function assertProducerNode(node) {
    node.liveConsumerNode ??= [];
    node.liveConsumerIndexOfThis ??= [];
  }
  function consumerIsLive(node) {
    return node.consumerIsAlwaysLive || (node?.liveConsumerNode?.length ?? 0) > 0;
  }
  function producerAddLiveConsumer(node, consumer, indexOfThis) {
    assertProducerNode(node);
    assertConsumerNode(node);
    if (node.liveConsumerNode.length === 0) {
      node.watched?.call(node.wrapper);
      for (let i = 0; i < node.producerNode.length; i++) {
        node.producerIndexOfThis[i] = producerAddLiveConsumer(node.producerNode[i], node, i);
      }
    }
    node.liveConsumerIndexOfThis.push(indexOfThis);
    return node.liveConsumerNode.push(consumer) - 1;
  }
  function producerRemoveLiveConsumerAtIndex(node, idx) {
    assertProducerNode(node);
    assertConsumerNode(node);
    if (node.liveConsumerNode.length === 1) {
      node.unwatched?.call(node.wrapper);
      for (let i = 0; i < node.producerNode.length; i++) {
        producerRemoveLiveConsumerAtIndex(node.producerNode[i], node.producerIndexOfThis[i]);
      }
    }
    const lastIdx = node.liveConsumerNode.length - 1;
    node.liveConsumerNode[idx] = node.liveConsumerNode[lastIdx];
    node.liveConsumerIndexOfThis[idx] = node.liveConsumerIndexOfThis[lastIdx];
    node.liveConsumerNode.length--;
    node.liveConsumerIndexOfThis.length--;
    if (idx < node.liveConsumerNode.length) {
      const idxProducer = node.liveConsumerIndexOfThis[idx];
      const consumer = node.liveConsumerNode[idx];
      assertConsumerNode(consumer);
      consumer.producerIndexOfThis[idxProducer] = idx;
    }
  }
  function producerAccessed(node) {
    if (inNotificationPhase) {
      throw new Error("Read in notify");
    }
    if (activeConsumer === null) return;
    const idx = activeConsumer.nextProducerIndex++;
    assertConsumerNode(activeConsumer);
    if (idx < activeConsumer.producerNode.length && activeConsumer.producerNode[idx] !== node) {
      if (consumerIsLive(activeConsumer)) {
        const staleProducer = activeConsumer.producerNode[idx];
        producerRemoveLiveConsumerAtIndex(staleProducer, activeConsumer.producerIndexOfThis[idx]);
      }
    }
    if (activeConsumer.producerNode[idx] !== node) {
      activeConsumer.producerNode[idx] = node;
      activeConsumer.producerIndexOfThis[idx] = consumerIsLive(activeConsumer) ? producerAddLiveConsumer(node, activeConsumer, idx) : 0;
    }
    activeConsumer.producerLastReadVersion[idx] = node.version;
  }
  function producerIncrementEpoch() {
    epoch++;
  }
  function consumerPollProducersForChange(node) {
    assertConsumerNode(node);
    for (let i = 0; i < node.producerNode.length; i++) {
      const producer = node.producerNode[i];
      const seenVersion = node.producerLastReadVersion[i];
      if (seenVersion !== producer.version) return true;
      producerUpdateValueVersion(producer);
      if (seenVersion !== producer.version) return true;
    }
    return false;
  }
  function producerUpdateValueVersion(node) {
    if (!node.dirty && node.lastCleanEpoch === epoch) return;
    if (!node.producerMustRecompute(node) && !consumerPollProducersForChange(node)) {
      node.dirty = false;
      node.lastCleanEpoch = epoch;
      return;
    }
    node.producerRecomputeValue(node);
    node.dirty = false;
    node.lastCleanEpoch = epoch;
  }
  function producerNotifyConsumers(node) {
    if (node.liveConsumerNode === void 0) return;
    const prev = inNotificationPhase;
    inNotificationPhase = true;
    try {
      for (const consumer of node.liveConsumerNode) {
        if (!consumer.dirty) {
          consumerMarkDirty(consumer);
        }
      }
    } finally {
      inNotificationPhase = prev;
    }
  }
  function consumerMarkDirty(node) {
    node.dirty = true;
    producerNotifyConsumers(node);
    node.consumerMarkedDirty?.call(node.wrapper ?? node);
  }
  function consumerBeforeComputation(node) {
    node && (node.nextProducerIndex = 0);
    return setActiveConsumer(node);
  }
  function consumerAfterComputation(node, prevConsumer) {
    setActiveConsumer(prevConsumer);
    if (!node || node.producerNode === void 0) return;
    if (consumerIsLive(node)) {
      for (let i = node.nextProducerIndex; i < node.producerNode.length; i++) {
        producerRemoveLiveConsumerAtIndex(node.producerNode[i], node.producerIndexOfThis[i]);
      }
    }
    while (node.producerNode.length > node.nextProducerIndex) {
      node.producerNode.pop();
      node.producerLastReadVersion.pop();
      node.producerIndexOfThis.pop();
    }
  }
  function defaultEquals(a, b) {
    return Object.is(a, b);
  }
  var NODE = Symbol("node");
  var UNSET = Symbol("UNSET");
  var COMPUTING = Symbol("COMPUTING");
  var ERRORED = Symbol("ERRORED");
  var State = class {
    [NODE];
    constructor(initialValue, options = {}) {
      const node = Object.create(REACTIVE_NODE);
      node.value = initialValue;
      node.equal = options.equals ?? defaultEquals;
      node.version = 0;
      node.wrapper = this;
      this[NODE] = node;
    }
    get() {
      producerAccessed(this[NODE]);
      return this[NODE].value;
    }
    set(newValue) {
      if (isInNotificationPhase()) {
        throw new Error("Write in notify");
      }
      const node = this[NODE];
      if (!node.equal(node.value, newValue)) {
        node.value = newValue;
        node.version++;
        producerIncrementEpoch();
        producerNotifyConsumers(node);
      }
    }
  };
  var Computed = class {
    [NODE];
    constructor(computation, options = {}) {
      const node = Object.create(REACTIVE_NODE);
      node.computation = computation;
      node.value = UNSET;
      node.dirty = true;
      node.error = null;
      node.equal = options.equals ?? defaultEquals;
      node.consumerAllowSignalWrites = true;
      node.wrapper = this;
      node.producerMustRecompute = (n) => n.value === UNSET || n.value === COMPUTING;
      node.producerRecomputeValue = (n) => {
        if (n.value === COMPUTING) {
          throw new Error("Cycle");
        }
        const oldValue = n.value;
        n.value = COMPUTING;
        const prevConsumer = consumerBeforeComputation(n);
        let newValue;
        let wasEqual = false;
        try {
          newValue = n.computation();
          const oldOk = oldValue !== UNSET && oldValue !== ERRORED;
          wasEqual = oldOk && n.equal(oldValue, newValue);
        } catch (err) {
          newValue = ERRORED;
          n.error = err;
        } finally {
          consumerAfterComputation(n, prevConsumer);
        }
        if (wasEqual) {
          n.value = oldValue;
          return;
        }
        n.value = newValue;
        n.version++;
      };
      this[NODE] = node;
    }
    get() {
      const node = this[NODE];
      producerUpdateValueVersion(node);
      producerAccessed(node);
      if (node.value === ERRORED) {
        throw node.error;
      }
      return node.value;
    }
  };
  var Watcher = class {
    [NODE];
    #signals = [];
    constructor(notify) {
      const node = Object.create(REACTIVE_NODE);
      node.wrapper = this;
      node.consumerMarkedDirty = notify;
      node.consumerIsAlwaysLive = true;
      node.consumerAllowSignalWrites = false;
      node.producerNode = [];
      this[NODE] = node;
    }
    watch(...signals) {
      const node = this[NODE];
      node.dirty = false;
      const prev = setActiveConsumer(node);
      for (const signal of signals) {
        producerAccessed(signal[NODE]);
        if (!this.#signals.includes(signal)) {
          this.#signals.push(signal);
        }
      }
      setActiveConsumer(prev);
    }
    unwatch(...signals) {
      const node = this[NODE];
      assertConsumerNode(node);
      for (let i = node.producerNode.length - 1; i >= 0; i--) {
        const signalNode = node.producerNode[i];
        if (signals.some((s) => s[NODE] === signalNode)) {
          producerRemoveLiveConsumerAtIndex(signalNode, node.producerIndexOfThis[i]);
          const lastIdx = node.producerNode.length - 1;
          node.producerNode[i] = node.producerNode[lastIdx];
          node.producerIndexOfThis[i] = node.producerIndexOfThis[lastIdx];
          node.producerNode.length--;
          node.producerIndexOfThis.length--;
          if (i < node.producerNode.length) {
            const idxConsumer = node.producerIndexOfThis[i];
            const producer = node.producerNode[i];
            assertProducerNode(producer);
            producer.liveConsumerIndexOfThis[idxConsumer] = i;
          }
        }
      }
      this.#signals = this.#signals.filter((s) => !signals.includes(s));
    }
    getPending() {
      const node = this[NODE];
      return (node.producerNode ?? []).filter((n) => n.dirty && n.computation !== void 0).map((n) => n.wrapper);
    }
  };
  function untrack(fn) {
    const prev = setActiveConsumer(null);
    try {
      return fn();
    } finally {
      setActiveConsumer(prev);
    }
  }

  // src/effect.ts
  var needsEnqueue = true;
  var watcher = new Watcher(() => {
    if (needsEnqueue) {
      needsEnqueue = false;
      queueMicrotask(processPending);
    }
  });
  function processPending() {
    needsEnqueue = true;
    for (const computed of watcher.getPending()) {
      computed.get();
    }
    watcher.watch();
  }
  function effect(callback) {
    let cleanup;
    const computed = new Computed(() => {
      if (typeof cleanup === "function") {
        cleanup();
      }
      cleanup = callback();
    });
    watcher.watch(computed);
    computed.get();
    return () => {
      watcher.unwatch(computed);
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }

  // src/index.ts
  var DIRECTIVES = {
    DATA: "x-data",
    TEXT: "x-text",
    HTML: "x-html",
    SHOW: "x-show",
    BIND: "x-bind",
    MODEL: "x-model",
    ON: "x-on",
    IF: "x-if",
    FOR: "x-for",
    REF: "x-ref"
  };
  var scopes = /* @__PURE__ */ new WeakMap();
  function createScopeFromString(el, dataStr) {
    const signals = {};
    const computeds = {};
    const scope = {
      signals,
      computeds,
      el,
      get(key) {
        if (key in signals) {
          return signals[key].get();
        }
        if (key in computeds) {
          return computeds[key].get();
        }
        return void 0;
      },
      set(key, value) {
        if (key in signals) {
          signals[key].set(value);
        }
      }
    };
    const tempData = new Function(`return (${dataStr})`)();
    for (const [key, value] of Object.entries(tempData)) {
      if (typeof value !== "function") {
        signals[key] = new State(value);
      }
    }
    const signalKeys = Object.keys(signals);
    const buildEvalCode = (bodyExpr) => {
      const getterCode = signalKeys.map((k) => `get ${k}() { return s.get('${k}'); }`).join(",");
      const setterCode = signalKeys.map((k) => `set ${k}(v) { s.set('${k}', v); }`).join(",");
      return `with({${getterCode}${setterCode ? "," + setterCode : ""}}){return(${bodyExpr})}`;
    };
    for (const [key, value] of Object.entries(tempData)) {
      if (typeof value === "function") {
        const fnStr = value.toString();
        let bodyExpr;
        if (fnStr.includes("=>")) {
          const arrowIndex = fnStr.indexOf("=>");
          bodyExpr = fnStr.slice(arrowIndex + 2).trim();
          if (bodyExpr.startsWith("{") && bodyExpr.endsWith("}")) {
            bodyExpr = bodyExpr.slice(1, -1).trim();
            if (!bodyExpr.includes("return")) {
              bodyExpr = `return (${bodyExpr})`;
            }
          }
        } else {
          const bodyMatch = fnStr.match(/\{([\s\S]*)\}/);
          bodyExpr = bodyMatch ? bodyMatch[1].trim() : "undefined";
        }
        const evalCode = buildEvalCode(bodyExpr);
        const evalFn = new Function("s", evalCode);
        computeds[key] = new Computed(() => {
          try {
            return evalFn(scope);
          } catch (e) {
            console.error(`Error in computed "${key}":`, e);
            return void 0;
          }
        });
      }
    }
    scopes.set(el, scope);
    return scope;
  }
  function buildWithCode(scope) {
    const keys = [...Object.keys(scope.signals), ...Object.keys(scope.computeds)];
    const g = keys.map((k) => `get ${k}(){return s.get('${k}')}`).join(",");
    const t = Object.keys(scope.signals).map((k) => `set ${k}(v){s.set('${k}',v)}`).join(",");
    return `with({${g}${t ? "," + t : ""}})`;
  }
  function evaluateExpression(expr, scope) {
    try {
      return new Function("s", `${buildWithCode(scope)}{return(${expr})}`)(scope);
    } catch (e) {
      console.error(`Error evaluating: ${expr}`, e);
      return void 0;
    }
  }
  function executeStatement(stmt, scope, event) {
    try {
      new Function("s", "$event", `${buildWithCode(scope)}{${stmt}}`)(scope, event);
    } catch (e) {
      console.error(`Error executing: ${stmt}`, e);
    }
  }
  function processTextDirective(el, expr, scope) {
    effect(() => {
      const value = evaluateExpression(expr, scope);
      el.textContent = String(value ?? "");
    });
  }
  function processHtmlDirective(el, expr, scope) {
    effect(() => {
      const value = evaluateExpression(expr, scope);
      el.innerHTML = String(value ?? "");
    });
  }
  function processShowDirective(el, expr, scope) {
    const originalDisplay = el.style.display || "";
    effect(() => {
      const value = evaluateExpression(expr, scope);
      el.style.display = value ? originalDisplay : "none";
    });
  }
  function processBindDirective(el, attr, expr, scope) {
    effect(() => {
      const value = evaluateExpression(expr, scope);
      if (attr === "class") {
        if (typeof value === "object" && value !== null) {
          for (const [className, enabled] of Object.entries(value)) {
            el.classList.toggle(className, Boolean(enabled));
          }
        } else {
          el.setAttribute("class", String(value ?? ""));
        }
      } else if (attr === "style") {
        if (typeof value === "object" && value !== null) {
          for (const [prop, val] of Object.entries(value)) {
            el.style.setProperty(prop, String(val ?? ""));
          }
        } else {
          el.setAttribute("style", String(value ?? ""));
        }
      } else if (value === null || value === void 0 || value === false) {
        el.removeAttribute(attr);
      } else if (value === true) {
        el.setAttribute(attr, "");
      } else {
        el.setAttribute(attr, String(value));
      }
    });
  }
  function processModelDirective(el, expr, scope) {
    const input = el;
    effect(() => {
      const value = evaluateExpression(expr, scope);
      if (input.type === "checkbox") {
        input.checked = Boolean(value);
      } else if (input.type === "radio") {
        input.checked = input.value === String(value);
      } else {
        input.value = String(value ?? "");
      }
    });
    const eventType = input.tagName === "SELECT" || input.type === "checkbox" || input.type === "radio" ? "change" : "input";
    input.addEventListener(eventType, () => {
      let newValue;
      if (input.type === "checkbox") {
        newValue = input.checked;
      } else if (input.type === "number" || input.type === "range") {
        newValue = input.valueAsNumber;
      } else {
        newValue = input.value;
      }
      if (expr in scope.signals) {
        scope.set(expr, newValue);
      } else {
        executeStatement(`${expr} = ${JSON.stringify(newValue)}`, scope);
      }
    });
  }
  function processEventDirective(el, eventName, handler, scope) {
    const parts = eventName.split(".");
    const event = parts[0];
    const modifiers = new Set(parts.slice(1));
    el.addEventListener(event, (e) => {
      if (modifiers.has("prevent")) e.preventDefault();
      if (modifiers.has("stop")) e.stopPropagation();
      if (modifiers.has("self") && e.target !== el) return;
      if (e instanceof KeyboardEvent) {
        if (modifiers.has("enter") && e.key !== "Enter") return;
        if (modifiers.has("escape") && e.key !== "Escape") return;
        if (modifiers.has("space") && e.key !== " ") return;
        if (modifiers.has("tab") && e.key !== "Tab") return;
      }
      executeStatement(handler, scope, e);
    }, { once: modifiers.has("once"), capture: modifiers.has("capture") });
  }
  function processElement(el, scope) {
    const attributes = Array.from(el.attributes);
    for (const attr of attributes) {
      const name = attr.name;
      const value = attr.value;
      if (name === DIRECTIVES.TEXT) {
        processTextDirective(el, value, scope);
      } else if (name === DIRECTIVES.HTML) {
        processHtmlDirective(el, value, scope);
      } else if (name === DIRECTIVES.SHOW) {
        processShowDirective(el, value, scope);
      } else if (name === DIRECTIVES.MODEL) {
        processModelDirective(el, value, scope);
      } else if (name.startsWith(DIRECTIVES.BIND + ":") || name.startsWith(":")) {
        const bindAttr = name.startsWith(":") ? name.slice(1) : name.slice(DIRECTIVES.BIND.length + 1);
        processBindDirective(el, bindAttr, value, scope);
      } else if (name.startsWith(DIRECTIVES.ON + ":") || name.startsWith("@")) {
        const eventName = name.startsWith("@") ? name.slice(1) : name.slice(DIRECTIVES.ON.length + 1);
        processEventDirective(el, eventName, value, scope);
      }
    }
  }
  function initializeComponent(root) {
    const dataAttr = root.getAttribute(DIRECTIVES.DATA);
    if (!dataAttr) return;
    let scope;
    try {
      scope = createScopeFromString(root, dataAttr);
    } catch (e) {
      console.error(`Error parsing x-data: ${dataAttr}`, e);
      return;
    }
    processElement(root, scope);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()) {
      if (node.hasAttribute(DIRECTIVES.DATA)) {
        continue;
      }
      processElement(node, scope);
    }
  }
  function init(root = document) {
    const components = root.querySelectorAll(`[${DIRECTIVES.DATA}]`);
    for (const component of components) {
      initializeComponent(component);
    }
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => init());
    } else {
      queueMicrotask(() => init());
    }
  }
  var SignalHTML = {
    init,
    State,
    Computed,
    effect,
    untrack,
    version: "0.1.0"
  };
  var index_default = SignalHTML;
  if (typeof window !== "undefined") {
    window.SignalHTML = SignalHTML;
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=signal-html.js.map
