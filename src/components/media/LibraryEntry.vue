<script setup lang="ts">
import { computed } from "vue";
import MediaCard from "./MediaCard.vue";
import type { MediaLayout } from "@/composables/useLayoutPreference";
import { LIBRARY_STATUSES, statusBg, type LibraryStatus } from "@/shared/library-status";
import type { RatingSystem } from "@/domain/rating";
import { tmdbImage } from "@/components/tmdb-image";
import { useTracking, type EntryUpdate } from "@/composables/useTracking";

const props = defineProps<{
  layout: MediaLayout;
  id: string;
  mediaId: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  status: LibraryStatus;
  filedStatus: LibraryStatus;
  score100?: number | null;
  watchedEpisodeCount: number;
  episodeTotal: number | null;
  ratingSystem: RatingSystem;
}>();

const emit = defineEmits<{
  update: [entry: EntryUpdate];
}>();

const { entry, saving, displayStatus, displayScore, canLogEpisode, setStatus, logWatch } =
  useTracking({
    mediaId: props.mediaId,
    mediaType: props.mediaType,
    episodeTotal: props.episodeTotal,
    ratingSystem: props.ratingSystem,
    initialEntry: {
      id: props.id,
      filedStatus: props.filedStatus,
      score100: props.score100 ?? null,
      watchedEpisodeCount: props.watchedEpisodeCount,
      updatedAt: Date.now(),
    },
    onUpdate: (next) =>
      emit("update", {
        id: props.id,
        filedStatus: next.filedStatus,
        status: displayStatus.value ?? props.status,
        score100: next.score100,
        watchedEpisodeCount: next.watchedEpisodeCount,
        updatedAt: next.updatedAt,
      }),
  });

const status = computed(() => displayStatus.value ?? props.status);
const statusDot = computed(() => statusBg(status.value));
const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));
const href = computed(() => (props.slug ? `/media/${props.slug}` : undefined));
const progress = computed(() => {
  if (props.mediaType !== "show") return null;
  const c = entry.value?.watchedEpisodeCount ?? 0;
  return props.episodeTotal !== null ? `${c}/${props.episodeTotal}` : `${c} ep`;
});

async function onStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const saved = await setStatus(target.value as LibraryStatus);
  if (!saved) target.value = status.value;
}
</script>

<template>
  <MediaCard
    v-if="layout === 'grid'"
    :title="title"
    :media-type="mediaType"
    :poster-path="posterPath"
    :release-date="releaseDate"
    :vote-average="voteAverage"
    :slug="slug"
  >
    <template #overlay>
      <span
        class="flex items-center gap-1.5 text-[0.6rem] font-mono lowercase px-1.5 py-0.5 rounded-md bg-bg/75 backdrop-blur-sm text-fg-muted"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="statusDot" aria-hidden="true" />
        {{ status }}
      </span>
    </template>

    <template #poster-action>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 text-fg-muted backdrop-blur-sm opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:border-fg hover:bg-fg hover:text-bg disabled:opacity-40 focus-ring"
        :disabled="saving || (mediaType === 'show' && !canLogEpisode)"
        :aria-label="mediaType === 'show' ? 'log next episode' : 'mark watched'"
        :title="
          mediaType === 'show' && !canLogEpisode
            ? 'every episode is already logged'
            : mediaType === 'show'
              ? 'log next episode'
              : 'mark watched'
        "
        @click="logWatch"
      >
        <span
          :class="mediaType === 'movie' ? 'i-lucide:check' : 'i-lucide:plus'"
          class="w-3.5 h-3.5"
          aria-hidden="true"
        />
      </button>
    </template>

    <template #meta>
      <div class="flex items-center gap-2 text-xs font-mono text-fg-subtle">
        <span v-if="progress">{{ progress }}</span>
        <span v-else-if="year">{{ year }}</span>
        <span v-if="displayScore !== null" class="ml-auto text-fg-muted">★ {{ displayScore }}</span>
      </div>
    </template>
  </MediaCard>

  <div
    v-else
    class="flex items-center gap-3 rounded-lg pr-2 hover:bg-bg-elevated transition-colors"
  >
    <a :href="href" class="flex min-w-0 flex-1 items-center gap-3 px-2 py-1.5 no-underline">
      <div class="w-8 h-12 shrink-0 overflow-hidden rounded bg-bg-elevated">
        <img
          v-if="posterPath"
          :src="tmdbImage(posterPath, 'w92')"
          :alt="`${title} poster`"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="min-w-0 flex flex-col">
        <span class="truncate font-mono text-sm text-fg">{{ title }}</span>
        <span class="font-mono text-xs text-fg-subtle">
          {{ mediaType }}<span v-if="year"> · {{ year }}</span
          ><span v-if="progress"> · {{ progress }}</span>
        </span>
      </div>
    </a>

    <span v-if="displayScore !== null" class="shrink-0 font-mono text-xs text-fg-muted"
      >★ {{ displayScore }}</span
    >

    <select
      :value="status"
      :disabled="saving"
      class="shrink-0 rounded-md border border-border text-xs font-mono px-2 py-1 outline-none transition-colors disabled:opacity-60 cursor-pointer bg-bg-subtle text-fg-muted hover:text-fg"
      aria-label="status"
      @change="onStatusChange"
    >
      <option v-for="s in LIBRARY_STATUSES" :key="s" :value="s">{{ s }}</option>
    </select>

    <button
      type="button"
      class="shrink-0 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg-subtle text-fg-muted transition-colors hover:border-fg hover:bg-fg hover:text-bg disabled:opacity-40 focus-ring"
      :disabled="saving || (mediaType === 'show' && !canLogEpisode)"
      :aria-label="mediaType === 'show' ? 'log next episode' : 'mark watched'"
      :title="
        mediaType === 'show' && !canLogEpisode
          ? 'every episode is already logged'
          : mediaType === 'show'
            ? 'log next episode'
            : 'mark watched'
      "
      @click="logWatch"
    >
      <span
        :class="mediaType === 'movie' ? 'i-lucide:check' : 'i-lucide:plus'"
        class="w-3.5 h-3.5"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
