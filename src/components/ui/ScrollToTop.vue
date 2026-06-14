<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > 400;
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-show="visible"
      type="button"
      class="fixed bottom-4 inset-ie-4 z-50 w-12 h-12 flex items-center justify-center rounded-full border border-border bg-bg-elevated text-fg-muted hover:text-fg transition-colors active:scale-95 shadow-lg"
      aria-label="scroll to top"
      @click="scrollTop"
    >
      <span class="i-lucide:arrow-up w-5 h-5" aria-hidden="true" />
    </button>
  </Transition>
</template>
