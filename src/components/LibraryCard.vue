<script setup lang="ts">
import { computed } from "vue";
import BaseCard from "./BaseCard.vue";
import type { LibraryStatus } from "@/domain/tracking/library";
import type { RatingSystem } from "@/domain/rating";
import { useTracking, type TrackedEntry } from "@/composables/useTracking";
import { tmdbImage } from "./tmdb-image";

const props = defineProps<{
  id: string;
  mediaId: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  status: LibraryStatus;
  score100?: number | null;
  watchedEpisodeCount: number;
  episodeTotal: number | null;
  ratingSystem: RatingSystem;
}>();

const emit = defineEmits<{
  update: [entry: TrackedEntry];
}>();

const {
  entry,
  saving,
  displayScore,
  scoreMax,
  progressText,
  canLogEpisode,
  setStatus,
  setScore,
  logWatch,
} = useTracking({
  mediaId: props.mediaId,
  mediaType: props.mediaType,
  episodeTotal: props.episodeTotal,
  ratingSystem: props.ratingSystem,
  initialEntry: {
    id: props.id,
    status: props.status,
    score100: props.score100 ?? null,
    watchedEpisodeCount: props.watchedEpisodeCount,
    updatedAt: Date.now(),
  },
  onUpdate: (next) => emit("update", { ...next, id: props.id }),
});

const status = computed(() => entry.value?.status ?? props.status);
const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));

const statusClass: Record<LibraryStatus, string> = {
  planned: "badge-planned",
  watching: "badge-watching",
  completed: "badge-completed",
  paused: "badge-paused",
  dropped: "badge-dropped",
};

async function onStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const saved = await setStatus(target.value as LibraryStatus);
  if (!saved) target.value = status.value;
}

async function onScoreInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const saved = await setScore(Number(target.value));
  if (!saved) target.value = displayScore.value === null ? "" : String(displayScore.value);
}
</script>

<template>
  <BaseCard>
    <a :href="slug ? `/media/${slug}` : undefined" class="block overflow-hidden rounded-t-lg">
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

    <div class="flex flex-col gap-2 p-3">
      <a
        :href="slug ? `/media/${slug}` : undefined"
        class="font-mono text-sm text-fg leading-snug line-clamp-2 hover:text-accent transition-colors"
      >
        {{ title }}
      </a>

      <div class="flex items-center gap-1.5 text-xs text-fg-subtle font-mono">
        <span v-if="year">{{ year }}</span>
        <span class="ml-auto text-[0.65rem] px-1.5 py-0.5 rounded-full border border-border-subtle">
          {{ mediaType }}
        </span>
      </div>

      <!-- Status select -->
      <select
        :value="status"
        :disabled="saving"
        class="w-full rounded-lg border text-xs font-mono px-2 py-1.5 outline-none transition-colors disabled:opacity-60 cursor-pointer bg-bg-elevated text-fg-muted"
        :class="statusClass[status]"
        aria-label="status"
        @change="onStatusChange"
      >
        <option value="planned">planned</option>
        <option value="watching">watching</option>
        <option value="completed">completed</option>
        <option value="paused">paused</option>
        <option value="dropped">dropped</option>
      </select>

      <!-- Score input -->
      <div class="flex items-center gap-1.5">
        <input
          type="number"
          :min="0"
          :max="scoreMax"
          :value="displayScore ?? ''"
          :placeholder="`/ ${scoreMax}`"
          :disabled="saving"
          class="flex-1 min-w-0 bg-bg-elevated border border-border rounded-lg px-2 py-1 text-xs font-mono text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors disabled:opacity-60"
          aria-label="rating"
          @change="onScoreInput"
        />
        <span class="text-xs font-mono text-fg-subtle shrink-0">/ {{ scoreMax }}</span>
      </div>

      <div
        v-if="mediaType === 'movie'"
        class="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated px-2 py-1.5"
      >
        <span class="text-[0.7rem] font-mono text-fg-subtle">watch activity</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-[0.7rem] font-mono text-fg transition-colors hover:bg-accent/15 disabled:opacity-60 focus-ring"
          :disabled="saving"
          @click="logWatch"
        >
          <span class="i-lucide:check w-3 h-3" aria-hidden="true" />
          watched
        </button>
      </div>

      <div
        v-else
        class="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated px-2 py-1.5"
      >
        <span class="min-w-0 text-[0.7rem] font-mono text-fg-subtle">{{ progressText }}</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1 text-[0.7rem] font-mono text-fg transition-colors hover:bg-accent/15 disabled:opacity-60 focus-ring"
          :disabled="saving || !canLogEpisode"
          @click="logWatch"
        >
          <span class="i-lucide:plus w-3 h-3" aria-hidden="true" />
          +1 ep
        </button>
      </div>
    </div>
  </BaseCard>
</template>
