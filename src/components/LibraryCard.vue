<script setup lang="ts">
import { ref, computed } from "vue";
import BaseCard from "./BaseCard.vue";

type Status = "planned" | "watching" | "completed" | "paused" | "dropped";
type RatingSystem = "score5" | "score10" | "score100";
type EntryState = {
  id: string;
  status: Status;
  score100: number | null;
  progressCurrent: number;
  progressTotal: number | null;
  updatedAt: number;
};
type TrackingResponse = {
  error?: string;
  entry?: Omit<EntryState, "updatedAt"> & { updatedAt?: number };
};

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

const props = defineProps<{
  id: string;
  mediaId: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  status: Status;
  score100?: number | null;
  progressCurrent: number;
  progressTotal: number | null;
  ratingSystem: RatingSystem;
}>();

const emit = defineEmits<{
  update: [entry: EntryState];
}>();

const localStatus = ref<Status>(props.status);
const localScore100 = ref<number | null>(props.score100 ?? null);
const localProgressCurrent = ref(props.progressCurrent);
const localProgressTotal = ref(props.progressTotal);
const saving = ref(false);

const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));

const statusClass: Record<Status, string> = {
  planned: "badge-planned",
  watching: "badge-watching",
  completed: "badge-completed",
  paused: "badge-paused",
  dropped: "badge-dropped",
};

const scoreMax = computed(() => {
  if (props.ratingSystem === "score5") return 5;
  if (props.ratingSystem === "score10") return 10;
  return 100;
});

const displayScore = computed(() => {
  if (localScore100.value === null) return null;
  if (props.ratingSystem === "score5") return Math.round(localScore100.value / 20);
  if (props.ratingSystem === "score10") return Math.round(localScore100.value / 10);
  return localScore100.value;
});

const progressText = computed(() => {
  if (props.mediaType !== "show") return null;
  if (localProgressTotal.value !== null) {
    return `${localProgressCurrent.value} / ${localProgressTotal.value} episodes`;
  }
  return `${localProgressCurrent.value} episodes`;
});

const canLogEpisode = computed(() => {
  if (props.mediaType !== "show") return false;
  return localProgressTotal.value === null || localProgressCurrent.value < localProgressTotal.value;
});

function createOccurrencePayload() {
  const occurredAt = Date.now();
  const localDate = new Date(occurredAt - new Date().getTimezoneOffset() * 60_000);
  return {
    occurredAt,
    occurredOn: localDate.toISOString().slice(0, 10),
  };
}

function syncEntry(entry: Omit<EntryState, "updatedAt"> & { updatedAt?: number }) {
  localStatus.value = entry.status;
  localScore100.value = entry.score100;
  localProgressCurrent.value = entry.progressCurrent;
  localProgressTotal.value = entry.progressTotal;
  emit("update", {
    id: props.id,
    status: entry.status,
    score100: entry.score100,
    progressCurrent: entry.progressCurrent,
    progressTotal: entry.progressTotal,
    updatedAt: entry.updatedAt ?? Date.now(),
  });
}

async function saveUpdate(newStatus: Status, newScore100: number | null) {
  saving.value = true;
  try {
    const res = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: props.mediaId, status: newStatus, score100: newScore100 }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok || !payload.entry) return false;
    syncEntry(payload.entry);
    return true;
  } finally {
    saving.value = false;
  }
}

async function onStatusChange(e: Event) {
  const previousStatus = localStatus.value;
  const val = (e.target as HTMLSelectElement).value as Status;
  localStatus.value = val;
  const saved = await saveUpdate(val, localScore100.value);
  if (!saved) {
    localStatus.value = previousStatus;
  }
}

async function onScoreInput(e: Event) {
  const previousScore = localScore100.value;
  const raw = Number((e.target as HTMLInputElement).value);
  let score100: number | null = null;
  if (!Number.isNaN(raw) && raw > 0) {
    if (props.ratingSystem === "score5") score100 = Math.min(100, raw * 20);
    else if (props.ratingSystem === "score10") score100 = Math.min(100, raw * 10);
    else score100 = Math.min(100, Math.max(0, raw));
  }
  localScore100.value = score100;
  const saved = await saveUpdate(localStatus.value, score100);
  if (!saved) {
    localScore100.value = previousScore;
  }
}

async function logMovieWatch() {
  saving.value = true;
  try {
    const res = await fetch("/api/tracking/movie-watch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId: props.mediaId,
        ...createOccurrencePayload(),
      }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok || !payload.entry) return;
    syncEntry(payload.entry);
  } finally {
    saving.value = false;
  }
}

async function logShowEpisode() {
  saving.value = true;
  try {
    const res = await fetch("/api/tracking/show-episode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId: props.mediaId,
        ...createOccurrencePayload(),
      }),
    });
    const payload = (await res.json()) as TrackingResponse;
    if (!res.ok || !payload.entry) return;
    syncEntry(payload.entry);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseCard>
    <a :href="slug ? `/media/${slug}` : undefined" class="block overflow-hidden rounded-t-lg">
      <div class="poster-wrap rounded-b-none">
        <img
          v-if="posterPath"
          :src="`${TMDB_IMG}${posterPath}`"
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
        :value="localStatus"
        :disabled="saving"
        class="w-full rounded-lg border text-xs font-mono px-2 py-1.5 outline-none transition-colors disabled:opacity-60 cursor-pointer bg-bg-elevated text-fg-muted"
        :class="statusClass[localStatus]"
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
          @click="logMovieWatch"
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
          @click="logShowEpisode"
        >
          <span class="i-lucide:plus w-3 h-3" aria-hidden="true" />
          +1 ep
        </button>
      </div>
    </div>
  </BaseCard>
</template>
