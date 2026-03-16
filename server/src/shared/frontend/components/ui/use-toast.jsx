import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 0;
const DEFAULT_TOAST_DURATION = 3000;
const DEDUPE_WINDOW_MS = 1500;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const listeners = new Set();

let memoryState = { toasts: [] };
const recentToastSignatures = new Map();

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t, open: false } : t
          ),
        };
      }
      return {
        ...state,
        toasts: state.toasts.map((t) => ({ ...t, open: false })),
      };
    }
    case "REMOVE_TOAST": {
      const { toastId } = action;
      if (!toastId) return { ...state, toasts: [] };
      return { ...state, toasts: state.toasts.filter((t) => t.id !== toastId) };
    }
    default:
      return state;
  }
}

const toastTimeouts = new Map();
const toastDismissTimeouts = new Map();

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function clearDismissTimer(toastId) {
  const timeout = toastDismissTimeouts.get(toastId);
  if (!timeout) return;
  clearTimeout(timeout);
  toastDismissTimeouts.delete(toastId);
}

function scheduleDismiss(toastId, duration = DEFAULT_TOAST_DURATION) {
  const safeDuration = Number(duration);
  if (!Number.isFinite(safeDuration) || safeDuration <= 0) return;
  clearDismissTimer(toastId);

  const timeout = setTimeout(() => {
    clearDismissTimer(toastId);
    dismiss(toastId);
  }, safeDuration);

  toastDismissTimeouts.set(toastId, timeout);
}

export function toast({ title, description, variant = "default", duration = DEFAULT_TOAST_DURATION } = {}) {
  const normalizedTitle = String(title || '').trim();
  const normalizedDescription = String(description || '').trim();
  const signature = `${variant}::${normalizedTitle}::${normalizedDescription}`;
  const now = Date.now();

  const lastTimestamp = Number(recentToastSignatures.get(signature) || 0);
  const duplicatedTooSoon = now - lastTimestamp < DEDUPE_WINDOW_MS;
  const existingToast = memoryState.toasts.find((toastItem) => toastItem.signature === signature && toastItem.open);
  if (duplicatedTooSoon && existingToast) {
    scheduleDismiss(existingToast.id, duration);
    return {
      id: existingToast.id,
      dismiss: () => dismiss(existingToast.id),
      update: (props) => {
        dispatch({ type: "UPDATE_TOAST", toast: { id: existingToast.id, ...props } });
        if (props?.duration !== undefined) {
          scheduleDismiss(existingToast.id, props.duration);
        }
      },
    };
  }

  recentToastSignatures.set(signature, now);

  const id = genId();

  dispatch({
    type: "ADD_TOAST",
    toast: {
      id,
      signature,
      title,
      description,
      variant,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss(id);
      },
    },
  });

  scheduleDismiss(id, duration);

  return {
    id,
    dismiss: () => dismiss(id),
    update: (props) => {
      dispatch({ type: "UPDATE_TOAST", toast: { id, ...props } });
      if (props?.duration !== undefined) {
        scheduleDismiss(id, props.duration);
      }
    },
  };
}

export function dismiss(toastId) {
  if (toastId) clearDismissTimer(toastId);
  else memoryState.toasts.forEach((t) => clearDismissTimer(t.id));
  dispatch({ type: "DISMISS_TOAST", toastId });
  if (toastId) addToRemoveQueue(toastId);
  else memoryState.toasts.forEach((t) => addToRemoveQueue(t.id));
}

export function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  return {
    ...state,
    toast,
    dismiss,
  };
}
