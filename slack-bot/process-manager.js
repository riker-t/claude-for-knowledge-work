// Process Guard — concurrency limiter + queue + active process registry
// run() is deliberately NOT async — slot reservation is 100% synchronous.
// fn receives an AbortSignal: fn(signal) => Promise

export class ProcessManager {
  constructor({ maxConcurrent = 2 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.active = new Map(); // threadTs → { startTime, mode, route, controller, runId }
    this.queue = []; // { resolve, reject, fn, threadTs, mode, route, priority, onStart }
    this.running = 0;
  }

  isActive(threadTs) {
    if (this.active.has(threadTs)) return true;
    return this.queue.some((q) => q.threadTs === threadTs);
  }

  // Kill an active process for a thread. Returns true if aborted.
  // Synchronously frees the slot so caller can immediately run() in its place.
  abort(threadTs) {
    const entry = this.active.get(threadTs);
    if (!entry) return false;
    if (entry.controller) entry.controller.abort();
    this.active.delete(threadTs);
    this.running--;
    console.log(`[pm] ABORT ${threadTs} (running: ${this.running}/${this.maxConcurrent})`);
    return true;
  }

  // NOT async — synchronous slot claim, returns a Promise
  // fn receives an AbortSignal: fn(signal) => Promise
  run(fn, { threadTs, mode, route, priority = 2, onQueued, onStart } = {}) {
    if (threadTs && this.isActive(threadTs)) {
      return Promise.reject(new Error("already_active"));
    }

    if (this.running < this.maxConcurrent) {
      // Claim slot synchronously — before ANY microtask can interleave
      const controller = new AbortController();
      const runId = Symbol();
      this.running++;
      if (threadTs) {
        this.active.set(threadTs, { startTime: Date.now(), mode, route, controller, runId });
      }
      console.log(`[pm] EXEC ${threadTs} (running: ${this.running}/${this.maxConcurrent})`);
      if (onStart) onStart();

      return fn(controller.signal).then(
        (result) => { this._release(threadTs, runId); return result; },
        (err) => { this._release(threadTs, runId); throw err; }
      );
    }

    // Queue — also synchronous
    console.log(`[pm] QUEUE ${threadTs} (running: ${this.running}/${this.maxConcurrent}, queued: ${this.queue.length + 1})`);
    if (onQueued) onQueued();

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, fn, threadTs, mode, route, priority, onStart });
      this.queue.sort((a, b) => b.priority - a.priority);
    });
  }

  _release(threadTs, runId) {
    if (threadTs) {
      const entry = this.active.get(threadTs);
      if (!entry || entry.runId !== runId) {
        // Stale release from an aborted run — slot already freed by abort()
        return;
      }
      this.active.delete(threadTs);
    }
    this.running--;
    console.log(`[pm] DONE ${threadTs} (running: ${this.running}/${this.maxConcurrent}, queued: ${this.queue.length})`);
    this._drain();
  }

  _drain() {
    while (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next.threadTs && this.active.has(next.threadTs)) {
        next.reject(new Error("already_active"));
        continue;
      }

      // Claim slot synchronously
      const controller = new AbortController();
      const runId = Symbol();
      this.running++;
      if (next.threadTs) {
        this.active.set(next.threadTs, { startTime: Date.now(), mode: next.mode, route: next.route, controller, runId });
      }
      console.log(`[pm] DEQUEUE ${next.threadTs} (running: ${this.running}/${this.maxConcurrent})`);
      if (next.onStart) next.onStart();

      next.fn(controller.signal).then(
        (result) => { this._release(next.threadTs, runId); next.resolve(result); },
        (err) => { this._release(next.threadTs, runId); next.reject(err); }
      );
    }
  }

  status() {
    const now = Date.now();
    const processes = [];
    for (const [threadTs, info] of this.active) {
      processes.push({
        threadTs,
        mode: info.mode,
        route: info.route,
        runtimeSec: Math.round((now - info.startTime) / 1000),
      });
    }
    return {
      active: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      processes,
    };
  }
}
