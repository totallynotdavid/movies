<script setup lang="ts">
import { ref } from "vue";
import Modal from "@/components/ui/Modal.vue";

const modalRef = ref<InstanceType<typeof Modal> | null>(null);
</script>

<template>
  <footer class="border-t border-border mt-12">
    <div class="container min-h-14 flex items-center justify-between text-fg-subtle text-xs">
      <span class="font-mono">track</span>
      <button
        type="button"
        aria-haspopup="dialog"
        class="hidden sm:flex items-center gap-3 font-mono text-fg-subtle/60 hover:text-fg-subtle transition-colors focus-ring rounded"
        @click="modalRef?.open()"
      >
        <span><kbd class="font-mono">?</kbd> hints</span>
        <span aria-hidden="true">·</span>
        <span><kbd class="font-mono">/</kbd> search</span>
        <span aria-hidden="true">·</span>
        <span><kbd class="font-mono">⌘K</kbd> palette</span>
      </button>
      <span class="font-mono">void + vite+</span>
    </div>

    <Modal ref="modalRef" title="keyboard shortcuts" class="w-auto max-w-lg">
      <p class="mb-2 font-mono text-fg-subtle">global</p>
      <ul class="mb-6 flex flex-col gap-2">
        <li class="flex gap-2 items-center">
          <kbd class="kbd">⌘K</kbd>
          <span>command palette</span>
        </li>
        <li class="flex gap-2 items-center">
          <kbd class="kbd">/</kbd>
          <span>focus search</span>
        </li>
        <li class="flex gap-2 items-center">
          <kbd class="kbd">?</kbd>
          <span>show keyboard hints</span>
        </li>
      </ul>
      <p class="mb-2 font-mono text-fg-subtle">search</p>
      <ul class="flex flex-col gap-2">
        <li class="flex gap-2 items-center">
          <kbd class="kbd">↑</kbd>/<kbd class="kbd">↓</kbd>
          <span>navigate results</span>
        </li>
        <li class="flex gap-2 items-center">
          <kbd class="kbd">Enter</kbd>
          <span>open result</span>
        </li>
      </ul>
    </Modal>
  </footer>
</template>

<style scoped>
.kbd {
  @apply items-center justify-center text-xs text-fg bg-bg-muted border border-border rounded px-2;
}
</style>
