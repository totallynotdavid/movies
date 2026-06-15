<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-sm font-mono text-fg-muted">{{ title }}</h2>
        <p v-if="subtitle" class="text-[0.8rem] text-fg-subtle">{{ subtitle }}</p>
      </div>
      <slot name="aside" />
    </div>
    <slot />
  </section>
</template>
