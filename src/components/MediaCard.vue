<script setup lang="ts">
import { computed } from "vue";
import BaseCard from "./BaseCard.vue";
import type { LibraryStatus } from "@/domain/tracking/library";
import type { MediaType } from "@/domain/catalog/media";
import { tmdbImage } from "./tmdb-image";

const props = defineProps<{
  title: string;
  mediaType: MediaType;
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  status?: LibraryStatus | null;
}>();

const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));

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
    <a
      :href="slug ? `/media/${slug}` : undefined"
      class="block -mx-0 -mt-0 overflow-hidden rounded-t-lg"
    >
      <div class="poster-wrap rounded-b-none">
        <img
          v-if="posterPath"
          :src="tmdbImage(posterPath, 'w342')"
          :alt="`${title} poster`"
          loading="lazy"
          decoding="async"
        />
        <div
          v-else
          class="w-full h-full flex items-end p-3 bg-bg-elevated text-fg-subtle text-xs font-mono"
        >
          no poster
        </div>
      </div>
    </a>

    <div class="flex flex-col gap-1.5 p-3">
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
        <span v-if="year && voteAverage" aria-hidden="true">·</span>
        <span v-if="voteAverage">★ {{ (voteAverage / 2).toFixed(1) }}</span>
        <span class="ml-auto text-[0.65rem] px-1.5 py-0.5 rounded-full border border-border-subtle">
          {{ mediaType }}
        </span>
      </div>
    </div>
  </BaseCard>
</template>
