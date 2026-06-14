<script setup lang="ts">
import { computed } from "vue";
import type { ProfileFormatStats } from "@/domain/insights/profile";
import { formatScore, type RatingSystem } from "@/domain/rating";

const props = defineProps<{ formatStats: ProfileFormatStats; ratingSystem: RatingSystem }>();

const panels = computed(() => [
  { key: "movie", label: "Movies", icon: "i-lucide:clapperboard", stats: props.formatStats.movie },
  { key: "show", label: "Shows", icon: "i-lucide:tv", stats: props.formatStats.show },
]);
</script>

<template>
  <section class="grid gap-4 md:grid-cols-2">
    <div
      v-for="panel in panels"
      :key="panel.key"
      class="flex flex-col gap-4 rounded-xl border border-border bg-bg-subtle p-5"
    >
      <h2 class="flex items-center gap-2 text-sm font-mono text-fg-muted">
        <span :class="panel.icon" class="w-4 h-4 text-fg-subtle" aria-hidden="true" />
        {{ panel.label }}
      </h2>

      <div class="grid grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-lg font-mono font-bold">{{ panel.stats.tracked }}</span>
          <span class="text-[0.7rem] font-mono text-fg-subtle">tracked</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-lg font-mono font-bold">{{ panel.stats.watchDays }}</span>
          <span class="text-[0.7rem] font-mono text-fg-subtle">watch days</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-lg font-mono font-bold">
            {{ formatScore(panel.stats.averageScore100, props.ratingSystem) }}
          </span>
          <span class="text-[0.7rem] font-mono text-fg-subtle">average score</span>
        </div>
      </div>
    </div>
  </section>
</template>
