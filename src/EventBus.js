/**
 * EventBus — lightweight pub/sub for decoupled cross-module communication.
 *
 * Usage:
 *   bus.on('shapeAdded', handler)
 *   bus.emit('shapeAdded', shape)
 *   bus.off('shapeAdded', handler)
 *   const unsub = bus.once('ready', handler)  // auto-unsubscribes after first call
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn); // returns unsubscribe fn
  }

  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  once(event, fn) {
    const wrapper = (...args) => { fn(...args); this.off(event, wrapper); };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    this._listeners.get(event)?.forEach(fn => fn(...args));
  }

  clear(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
  }
}
