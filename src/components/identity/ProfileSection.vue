<script setup lang="ts">
// The one section seam, shared by the public card and the owner dashboard so the
// whole page reads as a single system. title is a lowercase label; subtitle is
// optional sentence-case prose for insight sections (patterns, ledger).
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
