<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-mono text-fg-muted">{{ title }}</h2>
      <slot name="aside" />
    </div>
    <slot />
  </section>
</template>
