<script setup lang="ts">
import type { RecapYear } from "@/domain/recaps";

const props = defineProps<{
  username: string;
  items: RecapYear[];
  year?: number;
}>();
</script>

<template>
  <nav
    v-if="props.items.length > 0"
    class="flex flex-wrap items-center gap-x-4 gap-y-1"
    aria-label="recap years"
  >
    <template v-for="item in props.items" :key="item.year">
      <span
        v-if="item.access === 'locked'"
        class="inline-flex items-center gap-1 border-b-2 border-transparent pb-0.5 text-sm font-mono text-fg-subtle"
        :title="`${item.year} wrapped unlocks December 1`"
      >
        <span class="i-lucide:lock h-3 w-3" aria-hidden="true" />
        {{ item.year }}
      </span>
      <a
        v-else
        :href="`/u/${props.username}/${item.year}`"
        class="border-b-2 pb-0.5 text-sm font-mono transition-colors"
        :class="
          item.year === props.year
            ? 'border-accent text-accent'
            : 'border-transparent text-fg-muted hover:border-accent/50 hover:text-fg'
        "
        :aria-current="item.year === props.year ? 'page' : undefined"
      >
        {{ item.year }}
      </a>
    </template>
  </nav>
</template>
