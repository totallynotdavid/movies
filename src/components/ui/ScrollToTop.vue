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
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-show="visible"
      type="button"
      class="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-border-hover transition-all duration-200 shadow-lg"
      aria-label="scroll to top"
      @click="scrollTop"
    >
      <span class="i-lucide:arrow-up w-4 h-4" aria-hidden="true" />
    </button>
  </Transition>
</template>
