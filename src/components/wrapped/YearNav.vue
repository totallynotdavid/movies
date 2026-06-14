<script setup lang="ts">
const props = defineProps<{
  username: string;
  years: number[];
  year?: number;
  lockedYear?: number | null;
}>();
</script>

<template>
  <nav
    v-if="props.years.length > 0"
    class="flex flex-wrap items-center gap-2"
    aria-label="recap years"
  >
    <template v-for="y in props.years" :key="y">
      <span
        v-if="y === props.lockedYear"
        class="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs font-mono text-fg-subtle"
        :title="`${y} wrapped unlocks December 1`"
      >
        <span class="i-lucide:lock h-3 w-3" aria-hidden="true" />
        {{ y }}
      </span>
      <a
        v-else
        :href="`/u/${props.username}/${y}`"
        class="rounded-full border px-3 py-1 text-xs font-mono transition-colors"
        :class="
          y === props.year
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
        "
        :aria-current="y === props.year ? 'page' : undefined"
      >
        {{ y }}
      </a>
    </template>
  </nav>
</template>
