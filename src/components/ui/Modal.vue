<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    noScroll?: boolean;
  }>(),
  { noScroll: false },
);

const emit = defineEmits<{
  close: [];
  transitioned: [];
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

function open() {
  dialogRef.value?.showModal();
}

function close() {
  dialogRef.value?.close();
}

function onClose() {
  emit("close");
}

function onDialogTransitionEnd(event: TransitionEvent) {
  const el = dialogRef.value;
  if (!el) return;
  if (!el.open) return;
  if (event.target !== el) return;
  if (event.propertyName !== "opacity") return;
  emit("transitioned");
}

function onBackdropClick(e: MouseEvent) {
  const dialog = dialogRef.value;
  if (!dialog) return;
  const rect = dialog.getBoundingClientRect();
  const outside =
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom;
  if (outside) dialog.close();
}

defineExpose({ open, close });
</script>

<template>
  <dialog
    ref="dialogRef"
    closedby="any"
    class="w-[calc(100%-2rem)] bg-bg border border-border rounded-lg shadow-xl max-h-[90vh] overscroll-contain m-0 m-auto p-6 text-fg focus-visible:outline focus-visible:outline-accent/70"
    :class="noScroll ? 'overflow-hidden' : 'overflow-y-auto'"
    @close="onClose"
    @click="onBackdropClick"
    @transitionend="onDialogTransitionEnd"
  >
    <div v-if="title" class="flex items-center justify-between mb-6">
      <div>
        <h2 class="font-mono text-lg font-medium">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-xs text-fg-subtle">
          {{ subtitle }}
        </p>
      </div>
      <button
        type="button"
        class="group gap-x-1 inline-flex items-center justify-center font-mono border border-border rounded-md transition-all duration-200 cursor-pointer bg-transparent text-fg hover:enabled:(bg-fg/10) focus-visible:enabled:(bg-fg/10) text-sm px-4 py-2 disabled:(opacity-40 cursor-not-allowed border-transparent)"
        aria-label="close"
        @click="close"
      >
        <span class="i-lucide:x size-[1em]" aria-hidden="true" />
      </button>
    </div>
    <slot />
  </dialog>
</template>

<style scoped>
dialog:modal::backdrop {
  background: color-mix(in oklch, var(--bg-elevated) 70%, transparent);
}

dialog::backdrop {
  pointer-events: none;
}

dialog {
  opacity: 0;
  transition: opacity 200ms ease;
  transition-behavior: allow-discrete;
  scrollbar-gutter: stable;
}

dialog:modal {
  opacity: 1;
  transition: opacity 200ms ease;
  transition-behavior: allow-discrete;
}

@starting-style {
  dialog:modal {
    opacity: 0;
  }
}
</style>
