import * as React from "react";

export function create(createState) {
  let state;
  const listeners = new Set();

  const setState = (partial) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (nextState && typeof nextState === "object") {
      state = { ...state, ...nextState };
    } else {
      state = nextState;
    }
    listeners.forEach((listener) => listener());
  };

  const getState = () => state;

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api = { setState, getState, subscribe };
  state = createState(setState, getState, api);

  function useStore(selector = (s) => s) {
    return React.useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );
  }

  useStore.setState = setState;
  useStore.getState = getState;
  useStore.subscribe = subscribe;

  return useStore;
}
