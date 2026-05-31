<script setup lang="ts">
import { computed } from "vue";
import type { WrappedSummary } from "../../domain/insights/wrapped";
import { formatDay, formatHours, formatMetric, formatNumber } from "./format";

const props = defineProps<{ wrapped: WrappedSummary; userName: string }>();

const topTitle = computed(() => props.wrapped.topTitles[0] ?? null);
const topGenre = computed(() => props.wrapped.topGenres[0] ?? null);

const headline = computed(() => {
  if (!topTitle.value) {
    return `${props.userName}, here is your ${props.wrapped.year} watch story so far.`;
  }
  return `${props.userName}, ${topTitle.value.title} led your ${props.wrapped.year} watch story.`;
});

const dek = computed(() => {
  const hours = formatHours(props.wrapped.totalMinutes);
  const parts = [`You logged ${hours} across ${props.wrapped.watchDays} watch days.`];
  if (topGenre.value) {
    parts.push(`${topGenre.value.name} kept pulling you back in.`);
  }
  return parts.join(" ");
});

const summaryCards = computed(() => [
  {
    key: "minutes",
    label: "minutes watched",
    value: formatNumber(Math.round(props.wrapped.totalMinutes)),
    detail: `${formatHours(props.wrapped.totalMinutes)} total time`,
    icon: "i-lucide:clock-3",
  },
  {
    key: "days",
    label: "watch days",
    value: formatNumber(props.wrapped.watchDays),
    detail: `${props.wrapped.totalWatchCount} logged sessions`,
    icon: "i-lucide:calendar-days",
  },
  {
    key: "streak",
    label: "longest streak",
    value: `${props.wrapped.longestStreak}`,
    detail: props.wrapped.longestStreak === 1 ? "one day in a row" : "days in a row",
    icon: "i-lucide:flame",
  },
  {
    key: "busiest",
    label: "busiest day",
    value: props.wrapped.busiestDay ? formatDay(props.wrapped.busiestDay.date) : "n/a",
    detail: props.wrapped.busiestDay
      ? formatMetric(props.wrapped.busiestDay.minutes, props.wrapped.busiestDay.watchCount)
      : "log more watches to find it",
    icon: "i-lucide:sparkles",
  },
]);
</script>

<template>
  <section
    class="grid gap-8 border-b border-border pb-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center gap-3 text-xs font-mono text-fg-muted">
        <span class="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
          {{ wrapped.year }} wrapped
        </span>
        <span>year to date</span>
      </div>

      <div class="flex flex-col gap-3 max-w-2xl">
        <h1 class="text-4xl sm:text-5xl font-mono font-bold">{{ headline }}</h1>
        <p class="text-base text-fg-muted leading-relaxed">
          {{ dek }}
        </p>
      </div>

      <div class="flex flex-wrap gap-3 text-sm font-mono text-fg-subtle">
        <span v-if="topTitle">top title: {{ topTitle.title }}</span>
        <span v-if="topTitle && topGenre" aria-hidden="true">·</span>
        <span v-if="topGenre">top genre: {{ topGenre.name.toLowerCase() }}</span>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        class="flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-[0.7rem] font-mono text-fg-muted">{{ card.label }}</span>
          <span :class="card.icon" class="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-mono font-bold text-fg">{{ card.value }}</span>
          <span class="text-[0.7rem] font-mono text-fg-subtle">{{ card.detail }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
