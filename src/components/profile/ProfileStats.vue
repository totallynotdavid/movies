<script setup lang="ts">
import { computed } from "vue";
import type { ProfileFormatStats } from "@/domain/insights/profile";
import { formatScore, type RatingSystem } from "@/domain/rating";

// Per-format headline stats (tracked / watch days / average score), shared by the
// public portrait and the private dashboard. Average score renders in the given
// system; on a public profile that is the profile's fixed score100.
const props = defineProps<{ formatStats: ProfileFormatStats; ratingSystem: RatingSystem }>();

const panels = computed(() => [
  { key: "movie", label: "Movies", stats: props.formatStats.movie },
  { key: "show", label: "Shows", stats: props.formatStats.show },
]);
</script>

<template>
  <section class="grid gap-4 md:grid-cols-2">
    <div
      v-for="panel in panels"
      :key="panel.key"
      class="flex flex-col gap-4 rounded-xl border border-border bg-bg-subtle p-5"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">{{ panel.label }}</h2>
        <span
          class="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[0.65rem] font-mono text-fg-subtle"
        >
          {{ panel.stats.tracked }} tracked
        </span>
      </div>

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
