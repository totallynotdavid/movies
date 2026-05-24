<script setup lang="ts">
defineProps<{
  isExactMatch?: boolean;
  selected?: boolean;
}>();
</script>

<template>
  <article
    class="group bg-bg-subtle border border-border rounded-lg transition-[border-color,background-color] duration-200 hover:(border-border-hover bg-bg-muted) cursor-pointer relative focus-within:(outline-none ring-2 ring-fg/50 ring-offset-2 bg-bg-muted border-border-hover)"
    :class="{
      'border-accent/30 bg-accent/5': isExactMatch,
      'bg-fg-subtle/15!': selected,
    }"
  >
    <div
      v-if="isExactMatch"
      class="absolute -inset-px rounded-lg bg-gradient-to-r from-accent/0 via-accent/0 to-accent/10 opacity-100 blur-sm -z-1 pointer-events-none motion-reduce:opacity-50"
      aria-hidden="true"
    />
    <slot />
  </article>
</template>
