<script setup lang="ts">
defineProps<{ title: string; hint?: string }>();
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-col gap-0.5">
      <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">{{ title }}</h2>
      <p v-if="hint" class="text-xs text-fg-subtle">{{ hint }}</p>
    </div>
    <div
      class="rounded-xl border border-border bg-bg-subtle overflow-hidden divide-y divide-border"
    >
      <slot />
    </div>
  </section>
</template>
