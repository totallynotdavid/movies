<script setup lang="ts">
import { useToast, type ToastTone, type Toast } from "@/composables/useToast";

const { toasts, dismiss } = useToast();

const icons: Record<ToastTone, string> = {
  success: "i-lucide:circle-check",
  error: "i-lucide:circle-alert",
  info: "i-lucide:info",
};
const iconColor: Record<ToastTone, string> = {
  success: "text-green-500",
  error: "text-red-400",
  info: "text-accent",
};

async function runAction(toast: Toast) {
  const action = toast.action;
  dismiss(toast.id);
  if (action) await action.run();
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 translate-y-2"
      move-class="transition duration-150"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-bg-subtle/95 px-3.5 py-2.5 shadow-lg shadow-bg-elevated/40 backdrop-blur-sm"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
        :aria-live="toast.tone === 'error' ? 'assertive' : 'polite'"
      >
        <span
          :class="[icons[toast.tone], iconColor[toast.tone]]"
          class="size-4 shrink-0"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 font-mono text-sm text-fg">{{ toast.message }}</span>
        <button
          v-if="toast.action"
          type="button"
          class="shrink-0 rounded-md px-2 py-1 font-mono text-xs text-accent hover:bg-fg/10 focus-ring"
          @click="runAction(toast)"
        >
          {{ toast.action.label }}
        </button>
        <button
          type="button"
          class="shrink-0 rounded text-fg-subtle hover:text-fg focus-ring"
          aria-label="dismiss"
          @click="dismiss(toast.id)"
        >
          <span class="i-lucide:x size-3.5" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
