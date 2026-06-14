<script setup lang="ts">
import { computed, ref } from "vue";
import MediaCollection from "./MediaCollection.vue";
import LibraryEntry from "./LibraryEntry.vue";
import LayoutToggle from "@/components/ui/LayoutToggle.vue";
import { useLayoutPreference } from "@/composables/useLayoutPreference";
import { LIBRARY_STATUSES, LIBRARY_STATUS_LABELS } from "@/shared/library-status";
import type { LibraryEntryWithProgress } from "@/domain/tracking/library-entries";
import type { RatingSystem } from "@/domain/rating";
import type { TrackedEntry } from "@/composables/useTracking";

const props = defineProps<{
  entries: LibraryEntryWithProgress[];
  ratingSystem: RatingSystem;
}>();

const localEntries = ref([...props.entries]);
const { layout } = useLayoutPreference();

const filterStatus = ref<string>("all");
const filterType = ref<"all" | "movie" | "show">("all");

type SortKey = "updated" | "title" | "rating" | "status";
const sortKey = ref<SortKey>("updated");

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "updated", label: "recent" },
  { value: "title", label: "title" },
  { value: "rating", label: "rating" },
  { value: "status", label: "status" },
];

const typeOptions: { value: "all" | "movie" | "show"; label: string }[] = [
  { value: "all", label: "all" },
  { value: "movie", label: "movies" },
  { value: "show", label: "shows" },
];

const statusOptions = [
  { value: "all", label: "all" },
  ...LIBRARY_STATUSES.map((status) => ({ value: status, label: LIBRARY_STATUS_LABELS[status] })),
];

const statusOrder: Record<string, number> = {
  watching: 0,
  planned: 1,
  completed: 2,
  paused: 3,
  dropped: 4,
};

const filteredEntries = computed(() => {
  let entries = localEntries.value;

  if (filterStatus.value !== "all") {
    entries = entries.filter((e) => e.status === filterStatus.value);
  }
  if (filterType.value !== "all") {
    entries = entries.filter((e) => e.media.mediaType === filterType.value);
  }

  return [...entries].sort((a, b) => {
    if (sortKey.value === "title") return a.media.title.localeCompare(b.media.title);
    if (sortKey.value === "rating") return (b.score100 ?? -1) - (a.score100 ?? -1);
    if (sortKey.value === "status")
      return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    return b.updatedAt - a.updatedAt;
  });
});

function onEntryUpdate(update: TrackedEntry) {
  const entry = localEntries.value.find((item) => item.id === update.id);
  if (entry) {
    entry.status = update.status;
    entry.score100 = update.score100;
    entry.watchedEpisodeCount = update.watchedEpisodeCount;
    entry.updatedAt = update.updatedAt;
  }
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">
          library
          <span class="text-fg-subtle ml-1">({{ filteredEntries.length }})</span>
        </h2>
        <LayoutToggle v-model="layout" />
      </div>

      <div
        class="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        <div class="flex gap-1 shrink-0">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap transition-colors focus-ring"
            :class="
              filterType === opt.value
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
            "
            @click="filterType = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <span class="w-px h-5 bg-border shrink-0" aria-hidden="true" />

        <div class="flex gap-1 shrink-0">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap transition-colors focus-ring"
            :class="
              filterStatus === opt.value
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
            "
            @click="filterStatus = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <span class="w-px h-5 bg-border shrink-0 hidden sm:block" aria-hidden="true" />

        <div
          class="flex shrink-0 rounded-lg border border-border overflow-hidden"
          role="group"
          aria-label="sort by"
        >
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 text-xs font-mono whitespace-nowrap transition-colors focus-ring"
            :class="
              sortKey === opt.value
                ? 'bg-bg-elevated text-fg'
                : 'bg-bg-subtle text-fg-muted hover:bg-bg-elevated hover:text-fg'
            "
            @click="sortKey = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="filteredEntries.length === 0"
      class="flex flex-col items-center gap-3 py-14 text-center"
    >
      <span class="i-lucide:inbox w-10 h-10 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted text-sm">nothing here yet</p>
      <p class="text-xs text-fg-subtle">
        press <kbd class="font-mono">⌘K</kbd> to find a title and start tracking
      </p>
    </div>

    <MediaCollection v-else :layout="layout">
      <LibraryEntry
        v-for="entry in filteredEntries"
        :key="entry.id"
        :layout="layout"
        :id="entry.id"
        :media-id="entry.media.id"
        :title="entry.media.title"
        :media-type="entry.media.mediaType"
        :poster-path="entry.media.posterPath"
        :release-date="entry.media.releaseDate"
        :vote-average="entry.media.voteAverage"
        :slug="entry.media.slug"
        :status="entry.status"
        :score100="entry.score100"
        :watched-episode-count="entry.watchedEpisodeCount"
        :episode-total="entry.media.episodeCount"
        :rating-system="ratingSystem"
        @update="onEntryUpdate"
      />
    </MediaCollection>
  </section>
</template>
