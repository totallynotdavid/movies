<script setup lang="ts">
import { computed, ref } from "vue";
import type { Props } from "./library.server";
import LibraryCard from "../src/components/LibraryCard.vue";
import MediaCard from "../src/components/MediaCard.vue";
import SkeletonCard from "../src/components/SkeletonCard.vue";

type Status = "planned" | "watching" | "completed" | "paused" | "dropped";
type RatingSystem = "score5" | "score10" | "score100";

type RemoteCandidate = {
  mediaType: "movie" | "show";
  providerId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  slug: string;
  cached: boolean;
  cachedMediaId: string | null;
};

const props = defineProps<Props>();

// Reactive local copy — no page reload needed
const localEntries = ref([...props.entries]);

const query = ref("");
const loading = ref(false);
const searchError = ref("");
const searchLocal = ref<
  Array<{
    id: string;
    title: string;
    mediaType: string;
    posterPath?: string | null;
    releaseDate?: string | null;
    voteAverage?: number | null;
    slug?: string;
  }>
>([]);
const searchRemote = ref<RemoteCandidate[]>([]);
const remoteEnabled = ref(false);
const hasSearched = ref(false);

const trackedIds = computed(() => new Set(localEntries.value.map((e) => e.media.id)));

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
  { value: "watching", label: "watching" },
  { value: "completed", label: "completed" },
  { value: "planned", label: "planned" },
  { value: "paused", label: "paused" },
  { value: "dropped", label: "dropped" },
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
    if (sortKey.value === "title") {
      return a.media.title.localeCompare(b.media.title);
    }
    if (sortKey.value === "rating") {
      return (b.score100 ?? -1) - (a.score100 ?? -1);
    }
    if (sortKey.value === "status") {
      return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    }
    return b.updatedAt - a.updatedAt;
  });
});

function onEntryUpdate(id: string, status: Status, score100: number | null) {
  const entry = localEntries.value.find((e) => e.id === id);
  if (entry) {
    entry.status = status;
    entry.score100 = score100;
    entry.updatedAt = Date.now();
  }
}

async function runSearch() {
  const q = query.value.trim();
  if (!q) return;

  searchError.value = "";
  hasSearched.value = true;
  loading.value = true;
  searchLocal.value = [];
  searchRemote.value = [];

  try {
    const res = await fetch(`/api/media/search?q=${encodeURIComponent(q)}&limit=12`);
    const payload = (await res.json()) as {
      error?: string;
      remoteEnabled?: boolean;
      local?: typeof searchLocal.value;
      remote?: RemoteCandidate[];
    };

    if (!res.ok) throw new Error(payload.error ?? "search failed");

    remoteEnabled.value = Boolean(payload.remoteEnabled);
    searchLocal.value = payload.local ?? [];
    searchRemote.value = payload.remote ?? [];
  } catch (err) {
    searchError.value = err instanceof Error ? err.message : "search failed";
  } finally {
    loading.value = false;
  }
}

async function addFromRemote(item: RemoteCandidate) {
  searchError.value = "";
  try {
    const cacheRes = await fetch("/api/media/cache", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item),
    });
    const cachePayload = (await cacheRes.json()) as { error?: string; mediaId?: string };
    if (!cacheRes.ok || !cachePayload.mediaId)
      throw new Error(cachePayload.error ?? "cache failed");

    const trackRes = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: cachePayload.mediaId, status: "planned" }),
    });
    if (!trackRes.ok) {
      const p = (await trackRes.json()) as { error?: string };
      throw new Error(p.error ?? "add failed");
    }

    const listRes = await fetch("/api/tracking/library");
    const list = (await listRes.json()) as { entries?: typeof localEntries.value };
    if (list.entries) localEntries.value = list.entries;
    clearSearch();
  } catch (err) {
    searchError.value = err instanceof Error ? err.message : "failed to add";
  }
}

async function addFromLocal(mediaId: string) {
  searchError.value = "";
  try {
    const res = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId, status: "planned" }),
    });
    if (!res.ok) {
      const p = (await res.json()) as { error?: string };
      throw new Error(p.error ?? "add failed");
    }

    const listRes = await fetch("/api/tracking/library");
    const list = (await listRes.json()) as { entries?: typeof localEntries.value };
    if (list.entries) localEntries.value = list.entries;
    clearSearch();
  } catch (err) {
    searchError.value = err instanceof Error ? err.message : "failed to add";
  }
}

function clearSearch() {
  query.value = "";
  searchLocal.value = [];
  searchRemote.value = [];
  hasSearched.value = false;
  searchError.value = "";
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Header -->
    <div class="flex-split motion-safe:animate-slide-up animate-fill-both">
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-mono font-bold">{{ user.name }}'s library</h1>
        <p class="text-fg-muted text-sm">track what you watch, plan what's next.</p>
      </div>
      <span
        class="text-xs font-mono px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-fg-muted shrink-0"
      >
        {{ localEntries.length }} tracked
      </span>
    </div>

    <!-- Search / Add -->
    <section
      class="flex flex-col gap-4 p-5 rounded-2xl border border-border bg-bg-subtle motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.05s"
    >
      <h2 class="text-sm font-mono text-fg-muted">add to library</h2>

      <div class="flex gap-2">
        <input
          v-model="query"
          type="search"
          placeholder="search tmdb or catalog..."
          class="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
          @keyup.enter="runSearch"
        />
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-accent/40 bg-accent/10 text-fg text-sm font-mono hover:bg-accent/15 transition-colors disabled:opacity-40 focus-ring"
          :disabled="loading || !query.trim()"
          @click="runSearch"
        >
          {{ loading ? "..." : "search" }}
        </button>
        <button
          v-if="hasSearched"
          type="button"
          class="px-3 py-2 rounded-lg border border-border bg-bg-subtle text-fg-muted text-sm font-mono hover:border-border-hover hover:text-fg transition-colors focus-ring"
          @click="clearSearch"
        >
          clear
        </button>
      </div>

      <p v-if="!remoteEnabled && hasSearched" class="text-xs text-fg-subtle font-mono">
        tmdb token missing — showing local matches only
      </p>

      <p v-if="searchError" class="text-sm text-red-400 font-mono">{{ searchError }}</p>

      <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <SkeletonCard v-for="n in 8" :key="n" />
      </div>

      <div
        v-else-if="searchLocal.length > 0 || searchRemote.length > 0"
        class="flex flex-col gap-5"
      >
        <div v-if="searchLocal.length > 0">
          <p class="text-xs font-mono text-fg-subtle mb-3">local matches</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div v-for="item in searchLocal" :key="item.id" class="flex flex-col gap-2">
              <MediaCard
                :title="item.title"
                :media-type="item.mediaType as 'movie' | 'show'"
                :poster-path="item.posterPath"
                :release-date="item.releaseDate"
                :vote-average="item.voteAverage"
              />
              <button
                type="button"
                class="w-full px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors focus-ring"
                :class="
                  trackedIds.has(item.id)
                    ? 'border-border text-fg-subtle cursor-default'
                    : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
                "
                :disabled="trackedIds.has(item.id)"
                @click="addFromLocal(item.id)"
              >
                {{ trackedIds.has(item.id) ? "already tracked" : "add to library" }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="searchRemote.length > 0">
          <p class="text-xs font-mono text-fg-subtle mb-3">tmdb matches</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div
              v-for="item in searchRemote"
              :key="`${item.mediaType}:${item.providerId}`"
              class="flex flex-col gap-2"
            >
              <MediaCard
                :title="item.title"
                :media-type="item.mediaType"
                :poster-path="item.posterPath"
                :release-date="item.releaseDate"
                :vote-average="item.voteAverage"
              />
              <button
                type="button"
                class="w-full px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors focus-ring"
                :class="
                  item.cachedMediaId && trackedIds.has(item.cachedMediaId)
                    ? 'border-border text-fg-subtle cursor-default'
                    : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
                "
                :disabled="Boolean(item.cachedMediaId && trackedIds.has(item.cachedMediaId))"
                @click="addFromRemote(item)"
              >
                {{
                  item.cachedMediaId && trackedIds.has(item.cachedMediaId)
                    ? "already tracked"
                    : "cache + add"
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="hasSearched && !loading"
        class="text-center py-6 text-fg-subtle text-sm font-mono"
      >
        no results found
      </div>
    </section>

    <!-- Library entries -->
    <section
      class="flex flex-col gap-5 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.1s"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-sm font-mono text-fg-muted">
          tracked
          <span class="text-fg-subtle ml-1">({{ filteredEntries.length }})</span>
        </h2>

        <div class="flex flex-wrap gap-2">
          <!-- Type filter -->
          <div class="flex gap-1">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors focus-ring"
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

          <!-- Status filter -->
          <div class="flex gap-1 flex-wrap">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors focus-ring"
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

          <!-- Sort -->
          <div
            class="flex rounded-lg border border-border overflow-hidden"
            role="group"
            aria-label="sort by"
          >
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 text-xs font-mono transition-colors focus-ring"
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
        <p class="text-xs text-fg-subtle">search above to add titles to your library</p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        <LibraryCard
          v-for="entry in filteredEntries"
          :key="entry.id"
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
          :rating-system="ratingSystem"
          @update="onEntryUpdate"
        />
      </div>
    </section>
  </div>
</template>
