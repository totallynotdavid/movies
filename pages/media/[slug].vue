<script setup lang="ts">
import { computed, ref } from "vue";
import type { Props } from "./[slug].server";

const TMDB_IMG_W500 = "https://image.tmdb.org/t/p/w500";
const TMDB_IMG_ORIG = "https://image.tmdb.org/t/p/original";

type Status = "planned" | "watching" | "completed" | "paused" | "dropped";
type LibraryEntryState = NonNullable<Props["libraryEntry"]>;
type TrackingResponse = {
  error?: string;
  entry?: LibraryEntryState & { updatedAt?: number };
};

const props = defineProps<Props>();

const favorited = ref(props.isFavorited);
const addingFav = ref(false);
const favError = ref("");

const localEntry = ref(props.libraryEntry ? { ...props.libraryEntry } : null);
const statusSaving = ref(false);
const scoreSaving = ref(false);
const watchSaving = ref(false);
const trackingError = ref("");

const year = props.media.releaseDate ? new Date(props.media.releaseDate).getFullYear() : null;

const scoreMax = computed(() => {
  if (props.ratingSystem === "score5") return 5;
  if (props.ratingSystem === "score10") return 10;
  return 100;
});

const displayScore = computed(() => {
  const s = localEntry.value?.score100;
  if (s === null || s === undefined) return null;
  if (props.ratingSystem === "score5") return Math.round(s / 20);
  if (props.ratingSystem === "score10") return Math.round(s / 10);
  return s;
});

const statusClass: Record<Status, string> = {
  planned: "badge-planned border",
  watching: "badge-watching border",
  completed: "badge-completed border",
  paused: "badge-paused border",
  dropped: "badge-dropped border",
};

const showProgressText = computed(() => {
  if (!localEntry.value || props.media.mediaType !== "show") return null;
  if (localEntry.value.progressTotal !== null) {
    return `${localEntry.value.progressCurrent} / ${localEntry.value.progressTotal} episodes`;
  }
  return `${localEntry.value.progressCurrent} episodes`;
});

const canLogEpisode = computed(() => {
  if (!localEntry.value || props.media.mediaType !== "show") return false;
  return (
    localEntry.value.progressTotal === null ||
    localEntry.value.progressCurrent < localEntry.value.progressTotal
  );
});

function createOccurrencePayload() {
  const occurredAt = Date.now();
  const localDate = new Date(occurredAt - new Date().getTimezoneOffset() * 60_000);
  return {
    occurredAt,
    occurredOn: localDate.toISOString().slice(0, 10),
  };
}

function syncLocalEntry(entry: LibraryEntryState) {
  localEntry.value = { ...entry };
}

async function toggleFavorite() {
  if (!props.user) {
    window.location.href = "/login";
    return;
  }

  addingFav.value = true;
  favError.value = "";

  try {
    const res = await fetch("/api/user/favorites", {
      method: favorited.value ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "media", mediaId: props.media.id }),
    });
    if (!res.ok) {
      const p = (await res.json()) as { error?: string };
      throw new Error(p.error ?? "failed");
    }
    favorited.value = !favorited.value;
  } catch (err) {
    favError.value = err instanceof Error ? err.message : "failed";
  } finally {
    addingFav.value = false;
  }
}

async function addToLibrary() {
  if (!props.user) {
    window.location.href = "/login";
    return;
  }

  trackingError.value = "";

  try {
    const res = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: props.media.id, status: "planned" }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok) throw new Error(payload.error ?? "failed");
    if (payload.entry) syncLocalEntry(payload.entry);
  } catch (error) {
    trackingError.value = error instanceof Error ? error.message : "failed";
  }
}

async function onStatusChange(e: Event) {
  if (!localEntry.value) return;
  const val = (e.target as HTMLSelectElement).value as Status;
  statusSaving.value = true;
  trackingError.value = "";
  try {
    const res = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId: props.media.id,
        status: val,
        score100: localEntry.value.score100,
      }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok) throw new Error(payload.error ?? "failed");
    if (payload.entry) syncLocalEntry(payload.entry);
  } catch (error) {
    trackingError.value = error instanceof Error ? error.message : "failed";
  } finally {
    statusSaving.value = false;
  }
}

async function onScoreChange(e: Event) {
  if (!localEntry.value) return;
  const raw = Number((e.target as HTMLInputElement).value);
  let score100: number | null = null;
  if (!Number.isNaN(raw) && raw > 0) {
    if (props.ratingSystem === "score5") score100 = Math.min(100, raw * 20);
    else if (props.ratingSystem === "score10") score100 = Math.min(100, raw * 10);
    else score100 = Math.min(100, Math.max(0, raw));
  }
  scoreSaving.value = true;
  trackingError.value = "";
  try {
    const res = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: props.media.id, status: localEntry.value.status, score100 }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok) throw new Error(payload.error ?? "failed");
    if (payload.entry) syncLocalEntry(payload.entry);
  } catch (error) {
    trackingError.value = error instanceof Error ? error.message : "failed";
  } finally {
    scoreSaving.value = false;
  }
}

async function logMovieWatch() {
  if (!localEntry.value) return;

  watchSaving.value = true;
  trackingError.value = "";
  try {
    const res = await fetch("/api/tracking/movie-watch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId: props.media.id,
        ...createOccurrencePayload(),
      }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok) throw new Error(payload.error ?? "failed");
    if (payload.entry) syncLocalEntry(payload.entry);
  } catch (error) {
    trackingError.value = error instanceof Error ? error.message : "failed";
  } finally {
    watchSaving.value = false;
  }
}

async function logShowEpisode() {
  if (!localEntry.value) return;

  watchSaving.value = true;
  trackingError.value = "";
  try {
    const res = await fetch("/api/tracking/show-episode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId: props.media.id,
        ...createOccurrencePayload(),
      }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok) throw new Error(payload.error ?? "failed");
    if (payload.entry) syncLocalEntry(payload.entry);
  } catch (error) {
    trackingError.value = error instanceof Error ? error.message : "failed";
  } finally {
    watchSaving.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Backdrop -->
    <div
      v-if="media.backdropPath"
      class="relative -mx-4 sm:-mx-6 -mt-8 sm:-mt-12 h-52 sm:h-72 overflow-hidden rounded-b-2xl"
    >
      <img
        :src="`${TMDB_IMG_ORIG}${media.backdropPath}`"
        :alt="`${media.title} backdrop`"
        class="w-full h-full object-cover object-top"
        loading="eager"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
    </div>

    <!-- Main content -->
    <div class="flex flex-col sm:flex-row gap-8 motion-safe:animate-slide-up animate-fill-both">
      <!-- Poster -->
      <div class="shrink-0 w-40 sm:w-48">
        <div class="poster-wrap">
          <img
            v-if="media.posterPath"
            :src="`${TMDB_IMG_W500}${media.posterPath}`"
            :alt="`${media.title} poster`"
            loading="eager"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-bg-elevated text-fg-subtle text-xs font-mono"
          >
            no poster
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="flex flex-col gap-5 flex-1 min-w-0">
        <div>
          <div class="flex items-start gap-3 flex-wrap mb-2">
            <h1 class="text-3xl font-mono font-bold flex-1">{{ media.title }}</h1>
            <span
              class="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-fg-muted"
            >
              {{ media.mediaType }}
            </span>
          </div>

          <div class="flex items-center gap-3 text-sm font-mono text-fg-muted flex-wrap">
            <span v-if="year">{{ year }}</span>
            <span v-if="year && media.voteAverage" aria-hidden="true">·</span>
            <span v-if="media.voteAverage">★ {{ (media.voteAverage / 2).toFixed(1) }}/5</span>
            <span v-if="media.voteCount" aria-hidden="true">·</span>
            <span v-if="media.voteCount">{{ media.voteCount.toLocaleString() }} votes</span>
          </div>
        </div>

        <p v-if="media.overview" class="text-fg-muted text-sm leading-relaxed max-w-prose">
          {{ media.overview }}
        </p>

        <!-- Library controls -->
        <div
          v-if="localEntry"
          class="flex flex-col gap-3 p-4 rounded-xl border border-border bg-bg-subtle"
        >
          <div class="flex items-center gap-2 text-xs font-mono text-fg-subtle">
            <span class="i-lucide:library w-3.5 h-3.5" aria-hidden="true" />
            in your library
          </div>

          <div class="flex flex-wrap gap-3">
            <!-- Status -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-fg-subtle">status</label>
              <select
                :value="localEntry.status"
                :disabled="statusSaving"
                class="rounded-lg border text-xs font-mono px-2.5 py-1.5 outline-none transition-colors disabled:opacity-60 cursor-pointer bg-bg-elevated text-fg"
                :class="statusClass[localEntry.status]"
                aria-label="status"
                @change="onStatusChange"
              >
                <option value="planned">planned</option>
                <option value="watching">watching</option>
                <option value="completed">completed</option>
                <option value="paused">paused</option>
                <option value="dropped">dropped</option>
              </select>
            </div>

            <!-- Rating -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-fg-subtle">rating</label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  :min="0"
                  :max="scoreMax"
                  :value="displayScore ?? ''"
                  :placeholder="`0`"
                  :disabled="scoreSaving"
                  class="w-16 bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors disabled:opacity-60"
                  aria-label="rating"
                  @change="onScoreChange"
                />
                <span class="text-xs font-mono text-fg-subtle">/ {{ scoreMax }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="media.mediaType === 'movie'"
            class="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2"
          >
            <div class="flex items-center gap-2 text-xs font-mono text-fg-subtle">
              <span class="i-lucide:circle-play w-3.5 h-3.5" aria-hidden="true" />
              watch activity
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-mono text-fg transition-colors hover:bg-accent/15 disabled:opacity-60 focus-ring"
              :disabled="watchSaving"
              @click="logMovieWatch"
            >
              <span class="i-lucide:check w-3.5 h-3.5" aria-hidden="true" />
              {{ watchSaving ? "..." : "log watch" }}
            </button>
          </div>

          <div
            v-else
            class="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2"
          >
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-xs font-mono text-fg-subtle">episode progress</span>
              <span class="text-sm font-mono text-fg">{{ showProgressText }}</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-mono text-fg transition-colors hover:bg-accent/15 disabled:opacity-60 focus-ring"
              :disabled="watchSaving || !canLogEpisode"
              @click="logShowEpisode"
            >
              <span class="i-lucide:plus w-3.5 h-3.5" aria-hidden="true" />
              {{ watchSaving ? "..." : "+1 episode" }}
            </button>
          </div>

          <a
            href="/library"
            class="text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
          >
            manage in library →
          </a>
        </div>

        <!-- Actions when not in library -->
        <div v-else class="flex gap-3 flex-wrap">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/40 bg-accent/10 text-fg text-sm font-mono hover:bg-accent/15 transition-colors focus-ring"
            @click="addToLibrary"
          >
            <span class="i-lucide:plus w-4 h-4" aria-hidden="true" />
            add to library
          </button>
        </div>

        <!-- Favorite -->
        <button
          v-if="user"
          type="button"
          class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono transition-colors focus-ring"
          :class="
            favorited
              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15'
              : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
          "
          :disabled="addingFav"
          @click="toggleFavorite"
        >
          <span
            class="w-4 h-4"
            :class="favorited ? 'i-lucide:heart-off' : 'i-lucide:heart'"
            aria-hidden="true"
          />
          {{ favorited ? "unfavorite" : "favorite" }}
        </button>

        <p v-if="favError || trackingError" class="text-sm text-red-400 font-mono">
          {{ trackingError || favError }}
        </p>
      </div>
    </div>
  </div>
</template>
