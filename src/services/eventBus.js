class EventBus {
  constructor() {
    this._map = Object.create(null);
  }
  on(event, fn) {
    if (!this._map[event]) this._map[event] = [];
    this._map[event].push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    if (this._map[event]) {
      this._map[event] = this._map[event].filter(f => f !== fn);
    }
  }
  emit(event, data) {
    (this._map[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error("[EventBus]", event, e); }
    });
  }
  once(event, fn) {
    const unsub = this.on(event, (data) => { fn(data); unsub(); });
    return unsub;
  }
}

export const eventBus = new EventBus();
