import { ref } from "vue";

// The app's single feedback channel. Any action that mutates server state reports
// its outcome here instead of each surface re-inventing (or forgetting) success
// and failure feedback. The host renders one aria-live region, so this doubles as
// the screen-reader announcer.

export type ToastTone = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  run: () => void | Promise<void>;
};

export type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
};

// Module-level so the queue is shared by the host and by callers that live
// outside the component tree (composables, action helpers).
const toasts = ref<Toast[]>([]);
let nextId = 1;

const DISMISS_MS = 5000;

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function push(tone: ToastTone, message: string, action?: ToastAction): number {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, tone, message, action }];
  // Errors stay until dismissed so a failure is never missed; the rest fade.
  if (tone !== "error") window.setTimeout(() => dismiss(id), DISMISS_MS);
  return id;
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success: (message: string, action?: ToastAction) => push("success", message, action),
    error: (message: string, action?: ToastAction) => push("error", message, action),
    info: (message: string, action?: ToastAction) => push("info", message, action),
  };
}
