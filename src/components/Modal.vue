<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{
    title?: string;
    noScroll?: boolean;
  }>(),
  { noScroll: false },
);

const emit = defineEmits<{
  close: [];
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
    class="w-full rounded-2xl border border-border bg-bg-subtle shadow-2xl text-fg outline-none"
    :class="noScroll ? '' : 'overflow-y-auto'"
    @close="onClose"
    @click="onBackdropClick"
  >
    <div class="p-6">
      <slot />
    </div>
  </dialog>
</template>
