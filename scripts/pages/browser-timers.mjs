// Browser equivalent of the abortable delay used by the original model simulator.
export function setTimeout(ms, value, { signal } = {}) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve(value);
    }, ms);
    function abort() {
      globalThis.clearTimeout(timer);
      reject(signal.reason);
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}
