<script setup lang="ts">
import { computed } from "vue";
import BaseCard from "./BaseCard.vue";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const props = defineProps<{
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  status?: "planned" | "watching" | "completed" | "paused" | "dropped" | null;
}>();

const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));

const rating = computed(() => (props.voteAverage ? (props.voteAverage / 2).toFixed(1) : null));

const statusClass: Record<string, string> = {
  planned: "badge-planned",
  watching: "badge-watching",
  completed: "badge-completed",
  paused: "badge-paused",
  dropped: "badge-dropped",
};
</script>

<template>
  <BaseCard>
    <a :href="slug ? `/media/${slug}` : undefined" class="block -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      <div class="poster-wrap rounded-b-none">
        <img
          v-if="posterPath"
          :src="`${TMDB_IMG}${posterPath}`"
          :alt="`${title} poster`"
          loading="lazy"
        />
        <div
          v-else
          class="w-full h-full flex items-end p-3 bg-bg-elevated text-fg-subtle text-xs font-mono"
        >
          no poster
        </div>
      </div>
    </a>

    <div class="flex flex-col gap-1.5 pt-3">
      <div class="flex items-start justify-between gap-2">
        <a
          :href="slug ? `/media/${slug}` : undefined"
          class="font-mono text-sm text-fg leading-snug line-clamp-2 hover:text-accent transition-colors"
        >
          {{ title }}
        </a>
        <span
          v-if="status"
          class="shrink-0 text-[0.65rem] px-1.5 py-0.5 rounded-full border font-mono lowercase"
          :class="statusClass[status]"
        >
          {{ status }}
        </span>
      </div>

      <div class="flex items-center gap-2 text-xs text-fg-subtle font-mono">
        <span v-if="year">{{ year }}</span>
        <span v-if="year && rating">·</span>
        <span v-if="rating">★ {{ rating }}</span>
        <span class="ml-auto text-[0.65rem] px-1.5 py-0.5 rounded-full border border-border">
          {{ mediaType }}
        </span>
      </div>
    </div>
  </BaseCard>
</template>
