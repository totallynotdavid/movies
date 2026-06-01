<script setup lang="ts">
import type { WrappedFormatStat, WrappedGenreStat } from "@/domain/insights/wrapped";
import { formatMetric } from "./format";
import ShareBar from "./ShareBar.vue";

defineProps<{ genres: WrappedGenreStat[]; formats: WrappedFormatStat[] }>();
</script>

<template>
  <section class="grid gap-10 lg:grid-cols-2">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 class="text-sm font-mono text-fg-muted">genres</h2>
        <p class="text-sm text-fg-subtle">What your watch time kept orbiting around.</p>
      </div>

      <div
        v-if="genres.length > 0"
        class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
      >
        <div v-for="genre in genres" :key="genre.name" class="flex flex-col gap-2 px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-mono text-fg">{{ genre.name }}</span>
            <span class="text-[0.7rem] font-mono text-fg-subtle">
              {{ formatMetric(genre.minutes, genre.watchCount) }}
            </span>
          </div>
          <ShareBar :share="genre.share" />
        </div>
      </div>

      <div
        v-else
        class="rounded-lg border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
      >
        No genre data yet.
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 class="text-sm font-mono text-fg-muted">watch mix</h2>
        <p class="text-sm text-fg-subtle">How your time split between movies and shows.</p>
      </div>

      <div
        class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
      >
        <div
          v-for="format in formats"
          :key="format.mediaType"
          class="flex flex-col gap-2 px-4 py-4"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-mono text-fg">{{ format.label }}</span>
            <span class="text-[0.7rem] font-mono text-fg-subtle">
              {{ formatMetric(format.minutes, format.watchCount) }}
            </span>
          </div>
          <ShareBar :share="format.share" />
        </div>
      </div>
    </div>
  </section>
</template>
