<script setup lang="ts">
import { computed, ref } from "vue";
import type { SeasonEpisodes } from "@/domain/catalog/episodes";

const props = defineProps<{
  seasons: SeasonEpisodes[];
  // "season:episode" keys the user has watched.
  watchedKeys: string[];
  // Whether the viewer can log (signed in and the title is tracked).
  canLog: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  log: [seasonNumber: number, episodeNumber: number];
}>();

const watched = computed(() => new Set(props.watchedKeys));

// Collapse all but the first season by default to keep long shows scannable.
const openSeasons = ref(new Set<number>(props.seasons.slice(0, 1).map((s) => s.seasonNumber)));

function toggleSeason(seasonNumber: number) {
  const next = new Set(openSeasons.value);
  if (next.has(seasonNumber)) next.delete(seasonNumber);
  else next.add(seasonNumber);
  openSeasons.value = next;
}

function key(seasonNumber: number, episodeNumber: number) {
  return `${seasonNumber}:${episodeNumber}`;
}

function isWatched(seasonNumber: number, episodeNumber: number) {
  return watched.value.has(key(seasonNumber, episodeNumber));
}

function watchedInSeason(season: SeasonEpisodes) {
  return season.episodes.filter((e) => isWatched(season.seasonNumber, e.episodeNumber)).length;
}
</script>

<template>
  <div
    v-if="seasons.length === 0"
    class="rounded-lg border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
  >
    Episode list is still loading. Check back in a moment.
  </div>

  <div v-else class="flex flex-col gap-3">
    <div
      v-for="season in seasons"
      :key="season.seasonNumber"
      class="rounded-lg border border-border bg-bg-subtle"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-ring"
        @click="toggleSeason(season.seasonNumber)"
      >
        <span class="text-sm font-mono text-fg">
          {{ season.seasonNumber === 0 ? "Specials" : `Season ${season.seasonNumber}` }}
        </span>
        <span class="flex items-center gap-3 text-[0.7rem] font-mono text-fg-subtle">
          {{ watchedInSeason(season) }} / {{ season.episodes.length }} watched
          <span
            class="h-3.5 w-3.5 transition-transform"
            :class="[
              openSeasons.has(season.seasonNumber)
                ? 'i-lucide:chevron-down'
                : 'i-lucide:chevron-right',
            ]"
            aria-hidden="true"
          />
        </span>
      </button>

      <ul
        v-if="openSeasons.has(season.seasonNumber)"
        class="flex flex-col divide-y divide-border border-t border-border"
      >
        <li
          v-for="ep in season.episodes"
          :key="ep.episodeNumber"
          class="flex items-center gap-3 px-4 py-2.5"
        >
          <span class="w-8 shrink-0 text-right text-[0.7rem] font-mono text-fg-subtle">
            {{ ep.episodeNumber }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-mono text-fg">
              {{ ep.name ?? `Episode ${ep.episodeNumber}` }}
            </p>
            <p v-if="ep.airDate || ep.runtime" class="text-[0.65rem] font-mono text-fg-subtle">
              <span v-if="ep.airDate">{{ ep.airDate }}</span>
              <span v-if="ep.airDate && ep.runtime" aria-hidden="true"> · </span>
              <span v-if="ep.runtime">{{ ep.runtime }} min</span>
            </p>
          </div>

          <span
            v-if="isWatched(season.seasonNumber, ep.episodeNumber)"
            class="inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-green-500"
          >
            <span class="i-lucide:check w-3.5 h-3.5" aria-hidden="true" />
            watched
          </span>
          <button
            v-else-if="canLog"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[0.7rem] font-mono text-fg-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-60 focus-ring"
            :disabled="saving"
            @click="emit('log', season.seasonNumber, ep.episodeNumber)"
          >
            <span class="i-lucide:plus w-3 h-3" aria-hidden="true" />
            log
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
