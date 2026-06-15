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
    class="flex flex-wrap items-center gap-x-4 gap-y-1"
    aria-label="recap years"
  >
    <template v-for="y in props.years" :key="y">
      <span
        v-if="y === props.lockedYear"
        class="inline-flex items-center gap-1 border-b-2 border-transparent pb-0.5 text-sm font-mono text-fg-subtle"
        :title="`${y} wrapped unlocks December 1`"
      >
        <span class="i-lucide:lock h-3 w-3" aria-hidden="true" />
        {{ y }}
      </span>
      <a
        v-else
        :href="`/u/${props.username}/${y}`"
        class="border-b-2 pb-0.5 text-sm font-mono transition-colors"
        :class="
          y === props.year
            ? 'border-accent text-accent'
            : 'border-transparent text-fg-muted hover:border-accent/50 hover:text-fg'
        "
        :aria-current="y === props.year ? 'page' : undefined"
      >
        {{ y }}
      </a>
    </template>
  </nav>
</template>
