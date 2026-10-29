// Tiny external store for useSyncExternalStore that notifies subscribers at
// most once per animation frame, so bursts of socket events cost one render.
export const createFrameStore = (initial) => {
  let state = initial;
  let frame = null;
  const listeners = new Set();

  const notify = () => {
    frame = null;
    listeners.forEach((l) => l());
  };

  return {
    get: () => state,
    set(updater) {
      state = updater(state);
      if (frame === null) frame = requestAnimationFrame(notify);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
