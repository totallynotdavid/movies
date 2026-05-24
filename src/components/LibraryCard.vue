<script setup lang="ts">
import { ref, computed } from "vue";
import BaseCard from "./BaseCard.vue";

type Status = "planned" | "watching" | "completed" | "paused" | "dropped";
type RatingSystem = "score5" | "score10" | "score100";

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
  ratingSystem: RatingSystem;
}>();

const emit = defineEmits<{
  update: [id: string, status: Status, score100: number | null];
}>();

const localStatus = ref<Status>(props.status);
const localScore100 = ref<number | null>(props.score100 ?? null);
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

async function saveUpdate(newStatus: Status, newScore100: number | null) {
  saving.value = true;
  try {
    const res = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: props.mediaId, status: newStatus, score100: newScore100 }),
    });
    if (!res.ok) return;
    emit("update", props.id, newStatus, newScore100);
  } finally {
    saving.value = false;
  }
}

async function onStatusChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value as Status;
  localStatus.value = val;
  await saveUpdate(val, localScore100.value);
}

async function onScoreInput(e: Event) {
  const raw = Number((e.target as HTMLInputElement).value);
  let score100: number | null = null;
  if (!Number.isNaN(raw) && raw > 0) {
    if (props.ratingSystem === "score5") score100 = Math.min(100, raw * 20);
    else if (props.ratingSystem === "score10") score100 = Math.min(100, raw * 10);
    else score100 = Math.min(100, Math.max(0, raw));
  }
  localScore100.value = score100;
  await saveUpdate(localStatus.value, score100);
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
    </div>
  </BaseCard>
</template>
