<script setup lang="ts">
import { computed } from "vue";
import type { ProfileStats } from "@/domain/insights/profile";
import { formatScore, type RatingSystem } from "@/domain/rating";

const props = defineProps<{
  stats: ProfileStats;
  ratingSystem: RatingSystem;
}>();

const items = computed(() => {
  const out: { value: string; label: string }[] = [
    { value: String(props.stats.tracked), label: "tracked" },
    { value: String(props.stats.watchDays), label: "watch days" },
  ];
  if (props.stats.averageScore100 !== null) {
    out.push({
      value: formatScore(props.stats.averageScore100, props.ratingSystem),
      label: "avg",
    });
  }
  return out;
});

const split = computed(() => {
  const movies = props.stats.byFormat.movie.tracked;
  const shows = props.stats.byFormat.show.tracked;
  const noun = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
  return `${noun(movies, "movie")} · ${noun(shows, "show")}`;
});
</script>

<template>
  <div class="flex flex-col gap-0.5 font-mono">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      <span v-for="item in items" :key="item.label" class="flex items-baseline gap-1.5">
        <span class="text-fg tabular-nums">{{ item.value }}</span>
        <span class="text-fg-subtle">{{ item.label }}</span>
      </span>
    </div>
    <p class="text-[0.7rem] text-fg-subtle">{{ split }}</p>
  </div>
</template>
