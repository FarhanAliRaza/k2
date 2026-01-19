/**
 * TC39 Signals - Minimal Implementation
 */

type Version = number;

let activeConsumer: ReactiveNode | null = null;
let inNotificationPhase = false;
let epoch: Version = 1;

interface ReactiveNode {
  version: Version;
  lastCleanEpoch: Version;
  dirty: boolean;
  producerNode: ReactiveNode[] | undefined;
  producerLastReadVersion: Version[] | undefined;
  producerIndexOfThis: number[] | undefined;
  nextProducerIndex: number;
  liveConsumerNode: ReactiveNode[] | undefined;
  liveConsumerIndexOfThis: number[] | undefined;
  consumerAllowSignalWrites: boolean;
  consumerIsAlwaysLive: boolean;
  producerMustRecompute(node: unknown): boolean;
  producerRecomputeValue(node: unknown): void;
  consumerMarkedDirty(): void;
  watched?(): void;
  unwatched?(): void;
  wrapper?: unknown;
  equal?(a: unknown, b: unknown): boolean;
  value?: unknown;
  computation?: () => unknown;
  error?: unknown;
}

const REACTIVE_NODE: ReactiveNode = {
  version: 0,
  lastCleanEpoch: 0,
  dirty: false,
  producerNode: undefined,
  producerLastReadVersion: undefined,
  producerIndexOfThis: undefined,
  nextProducerIndex: 0,
  liveConsumerNode: undefined,
  liveConsumerIndexOfThis: undefined,
  consumerAllowSignalWrites: false,
  consumerIsAlwaysLive: false,
  producerMustRecompute: () => false,
  producerRecomputeValue: () => {},
  consumerMarkedDirty: () => {},
};

function setActiveConsumer(consumer: ReactiveNode | null): ReactiveNode | null {
  const prev = activeConsumer;
  activeConsumer = consumer;
  return prev;
}

export function isInNotificationPhase(): boolean {
  return inNotificationPhase;
}

function assertConsumerNode(node: ReactiveNode): void {
  node.producerNode ??= [];
  node.producerIndexOfThis ??= [];
  node.producerLastReadVersion ??= [];
}

function assertProducerNode(node: ReactiveNode): void {
  node.liveConsumerNode ??= [];
  node.liveConsumerIndexOfThis ??= [];
}

function consumerIsLive(node: ReactiveNode): boolean {
  return node.consumerIsAlwaysLive || (node?.liveConsumerNode?.length ?? 0) > 0;
}

function producerAddLiveConsumer(node: ReactiveNode, consumer: ReactiveNode, indexOfThis: number): number {
  assertProducerNode(node);
  assertConsumerNode(node);
  if (node.liveConsumerNode!.length === 0) {
    node.watched?.call(node.wrapper);
    for (let i = 0; i < node.producerNode!.length; i++) {
      node.producerIndexOfThis![i] = producerAddLiveConsumer(node.producerNode![i], node, i);
    }
  }
  node.liveConsumerIndexOfThis!.push(indexOfThis);
  return node.liveConsumerNode!.push(consumer) - 1;
}

function producerRemoveLiveConsumerAtIndex(node: ReactiveNode, idx: number): void {
  assertProducerNode(node);
  assertConsumerNode(node);

  if (node.liveConsumerNode!.length === 1) {
    node.unwatched?.call(node.wrapper);
    for (let i = 0; i < node.producerNode!.length; i++) {
      producerRemoveLiveConsumerAtIndex(node.producerNode![i], node.producerIndexOfThis![i]);
    }
  }

  const lastIdx = node.liveConsumerNode!.length - 1;
  node.liveConsumerNode![idx] = node.liveConsumerNode![lastIdx];
  node.liveConsumerIndexOfThis![idx] = node.liveConsumerIndexOfThis![lastIdx];
  node.liveConsumerNode!.length--;
  node.liveConsumerIndexOfThis!.length--;

  if (idx < node.liveConsumerNode!.length) {
    const idxProducer = node.liveConsumerIndexOfThis![idx];
    const consumer = node.liveConsumerNode![idx];
    assertConsumerNode(consumer);
    consumer.producerIndexOfThis![idxProducer] = idx;
  }
}

function producerAccessed(node: ReactiveNode): void {
  if (inNotificationPhase) {
    throw new Error('Read in notify');
  }

  if (activeConsumer === null) return;

  const idx = activeConsumer.nextProducerIndex++;
  assertConsumerNode(activeConsumer);

  if (idx < activeConsumer.producerNode!.length && activeConsumer.producerNode![idx] !== node) {
    if (consumerIsLive(activeConsumer)) {
      const staleProducer = activeConsumer.producerNode![idx];
      producerRemoveLiveConsumerAtIndex(staleProducer, activeConsumer.producerIndexOfThis![idx]);
    }
  }

  if (activeConsumer.producerNode![idx] !== node) {
    activeConsumer.producerNode![idx] = node;
    activeConsumer.producerIndexOfThis![idx] = consumerIsLive(activeConsumer)
      ? producerAddLiveConsumer(node, activeConsumer, idx)
      : 0;
  }
  activeConsumer.producerLastReadVersion![idx] = node.version;
}

function producerIncrementEpoch(): void {
  epoch++;
}

function consumerPollProducersForChange(node: ReactiveNode): boolean {
  assertConsumerNode(node);
  for (let i = 0; i < node.producerNode!.length; i++) {
    const producer = node.producerNode![i];
    const seenVersion = node.producerLastReadVersion![i];
    if (seenVersion !== producer.version) return true;
    producerUpdateValueVersion(producer);
    if (seenVersion !== producer.version) return true;
  }
  return false;
}

function producerUpdateValueVersion(node: ReactiveNode): void {
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

function producerNotifyConsumers(node: ReactiveNode): void {
  if (node.liveConsumerNode === undefined) return;

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

function consumerMarkDirty(node: ReactiveNode): void {
  node.dirty = true;
  producerNotifyConsumers(node);
  node.consumerMarkedDirty?.call(node.wrapper ?? node);
}

function consumerBeforeComputation(node: ReactiveNode | null): ReactiveNode | null {
  node && (node.nextProducerIndex = 0);
  return setActiveConsumer(node);
}

function consumerAfterComputation(node: ReactiveNode | null, prevConsumer: ReactiveNode | null): void {
  setActiveConsumer(prevConsumer);
  if (!node || node.producerNode === undefined) return;

  if (consumerIsLive(node)) {
    for (let i = node.nextProducerIndex; i < node.producerNode.length; i++) {
      producerRemoveLiveConsumerAtIndex(node.producerNode[i], node.producerIndexOfThis![i]);
    }
  }

  while (node.producerNode.length > node.nextProducerIndex) {
    node.producerNode.pop();
    node.producerLastReadVersion!.pop();
    node.producerIndexOfThis!.pop();
  }
}

function defaultEquals<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}

const NODE = Symbol('node');

// Sentinel values for computed
const UNSET = Symbol('UNSET');
const COMPUTING = Symbol('COMPUTING');
const ERRORED = Symbol('ERRORED');

export interface SignalOptions<T> {
  equals?: (a: T, b: T) => boolean;
}

export class State<T> {
  readonly [NODE]: ReactiveNode;

  constructor(initialValue: T, options: SignalOptions<T> = {}) {
    const node: ReactiveNode = Object.create(REACTIVE_NODE);
    node.value = initialValue;
    node.equal = options.equals ?? defaultEquals;
    node.version = 0;
    node.wrapper = this;
    this[NODE] = node;
  }

  get(): T {
    producerAccessed(this[NODE]);
    return this[NODE].value as T;
  }

  set(newValue: T): void {
    if (isInNotificationPhase()) {
      throw new Error('Write in notify');
    }
    const node = this[NODE];
    if (!node.equal!(node.value, newValue)) {
      node.value = newValue;
      node.version++;
      producerIncrementEpoch();
      producerNotifyConsumers(node);
    }
  }
}

export class Computed<T> {
  readonly [NODE]: ReactiveNode;

  constructor(computation: () => T, options: SignalOptions<T> = {}) {
    const node: ReactiveNode = Object.create(REACTIVE_NODE);
    node.computation = computation;
    node.value = UNSET;
    node.dirty = true;
    node.error = null;
    node.equal = options.equals ?? defaultEquals;
    node.consumerAllowSignalWrites = true;
    node.wrapper = this;

    node.producerMustRecompute = (n: ReactiveNode) => n.value === UNSET || n.value === COMPUTING;

    node.producerRecomputeValue = (n: ReactiveNode) => {
      if (n.value === COMPUTING) {
        throw new Error('Cycle');
      }

      const oldValue = n.value;
      n.value = COMPUTING;

      const prevConsumer = consumerBeforeComputation(n);
      let newValue: unknown;
      let wasEqual = false;
      try {
        newValue = n.computation!();
        const oldOk = oldValue !== UNSET && oldValue !== ERRORED;
        wasEqual = oldOk && n.equal!(oldValue, newValue);
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

  get(): T {
    const node = this[NODE];
    producerUpdateValueVersion(node);
    producerAccessed(node);
    if (node.value === ERRORED) {
      throw node.error;
    }
    return node.value as T;
  }
}

export class Watcher {
  readonly [NODE]: ReactiveNode;
  #signals: Array<State<unknown> | Computed<unknown>> = [];

  constructor(notify: () => void) {
    const node: ReactiveNode = Object.create(REACTIVE_NODE);
    node.wrapper = this;
    node.consumerMarkedDirty = notify;
    node.consumerIsAlwaysLive = true;
    node.consumerAllowSignalWrites = false;
    node.producerNode = [];
    this[NODE] = node;
  }

  watch(...signals: Array<State<unknown> | Computed<unknown>>): void {
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

  unwatch(...signals: Array<State<unknown> | Computed<unknown>>): void {
    const node = this[NODE];
    assertConsumerNode(node);

    for (let i = node.producerNode!.length - 1; i >= 0; i--) {
      const signalNode = node.producerNode![i];
      if (signals.some(s => s[NODE] === signalNode)) {
        producerRemoveLiveConsumerAtIndex(signalNode, node.producerIndexOfThis![i]);

        const lastIdx = node.producerNode!.length - 1;
        node.producerNode![i] = node.producerNode![lastIdx];
        node.producerIndexOfThis![i] = node.producerIndexOfThis![lastIdx];

        node.producerNode!.length--;
        node.producerIndexOfThis!.length--;

        if (i < node.producerNode!.length) {
          const idxConsumer = node.producerIndexOfThis![i];
          const producer = node.producerNode![i];
          assertProducerNode(producer);
          producer.liveConsumerIndexOfThis![idxConsumer] = i;
        }
      }
    }

    this.#signals = this.#signals.filter(s => !signals.includes(s));
  }

  getPending(): Array<Computed<unknown>> {
    const node = this[NODE];
    return (node.producerNode ?? [])
      .filter(n => n.dirty && n.computation !== undefined)
      .map(n => n.wrapper as Computed<unknown>);
  }
}

export function untrack<T>(fn: () => T): T {
  const prev = setActiveConsumer(null);
  try {
    return fn();
  } finally {
    setActiveConsumer(prev);
  }
}
