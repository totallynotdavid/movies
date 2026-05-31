<script setup lang="ts">
import type { WrappedTitleStat } from "../../domain/insights/wrapped";
import { formatScore, type RatingSystem } from "../../domain/rating";
import { tmdbImage } from "../tmdb-image";
import { formatMetric } from "./format";

defineProps<{ titles: WrappedTitleStat[]; ratingSystem: RatingSystem }>();
</script>

<template>
  <section class="flex flex-col gap-6 border-b border-border pb-10">
    <div class="flex flex-col gap-2">
      <h2 class="text-sm font-mono text-fg-muted">most watched</h2>
      <p class="text-sm text-fg-subtle">The titles that absorbed the most time this year.</p>
    </div>

    <div class="grid gap-5 md:grid-cols-3">
      <a
        v-for="(title, index) in titles"
        :key="title.mediaId"
        :href="`/media/${title.slug}`"
        class="group flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4 transition-colors hover:border-border-hover"
      >
        <div class="poster-wrap rounded-lg">
          <img
            v-if="title.posterPath"
            :src="tmdbImage(title.posterPath, 'w342')"
            :alt="`${title.title} poster`"
            loading="lazy"
            decoding="async"
          />
          <div
            v-else
            class="flex h-full w-full items-end bg-bg-elevated p-3 text-xs font-mono text-fg-subtle"
          >
            no poster
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 text-[0.7rem] font-mono text-fg-subtle">
          <span>#{{ index + 1 }}</span>
          <span>{{ formatMetric(title.minutes, title.watchCount) }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-sm font-mono text-fg transition-colors group-hover:text-accent">
            {{ title.title }}
          </span>
          <div
            class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] font-mono text-fg-subtle"
          >
            <span>{{ title.mediaType }}</span>
            <span v-if="title.releaseDate" aria-hidden="true">·</span>
            <span v-if="title.releaseDate">{{ title.releaseDate.slice(0, 4) }}</span>
            <span v-if="title.score100 !== null" aria-hidden="true">·</span>
            <span v-if="title.score100 !== null">
              rated {{ formatScore(title.score100, ratingSystem) }}
            </span>
          </div>
        </div>
      </a>
    </div>
  </section>
</template>
