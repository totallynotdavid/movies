<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Props } from "./index.server";
import { mediaStatusLabel } from "@/domain/catalog/media";
import { STATS_MIN_SCORES, STATS_MIN_TRACKED } from "@/domain/insights/title-stats";
import { useTracking } from "@/composables/useTracking";
import { useHydrationPoll } from "@/composables/useHydrationPoll";
import CreditNameList from "@/components/media/CreditNameList.vue";
import EpisodeList from "@/components/media/EpisodeList.vue";
import MediaTabs from "@/components/media/MediaTabs.vue";
import { tmdbImage } from "@/components/tmdb-image";
import type { SeasonEpisodes } from "@/domain/catalog/episodes";
import type { LibraryStatus, ShowViewDto } from "@/shared/tracking";

const props = defineProps<Props>();

const favorited = ref(props.isFavorited);
const addingFav = ref(false);
const favError = ref("");

// Bumping the key after a successful toggle restarts the favorite animation.
// prefers-reduced-motion neutralizes the keyframes below.
const favPulse = ref(0);
const favAnimStyle = computed(() => {
  if (favPulse.value === 0) return {};
  return {
    animation: favorited.value
      ? "heart-spring 0.5s cubic-bezier(0.34,1.56,0.64,1)"
      : "heart-settle 0.3s ease",
  };
});
const seasons = ref<SeasonEpisodes[]>(props.seasons);
const seasonCount = ref(props.media.seasonCount);
const episodeTotal = ref(props.media.episodeCount);
const episodeHydrationError = ref(props.media.episodesError);

// Episode picker state. Watched keys are seeded from the loader and updated
// optimistically as the user logs episodes.
const watchedKeys = ref<string[]>([...props.watchedEpisodeKeys]);
const canLogEpisodes = computed(() => !!props.user);

async function fetchShowView(): Promise<ShowViewDto> {
  const res = await fetch(`/api/tracking/show-view?mediaId=${encodeURIComponent(props.media.id)}`);
  const payload = (await res.json()) as ShowViewDto & { error?: { kind?: string } };
  if (!res.ok) throw new Error(payload.error?.kind ?? "request failed");
  return payload;
}

function applyShowView(view: ShowViewDto) {
  seasons.value = view.seasons;
  seasonCount.value = view.seasonCount;
  episodeTotal.value = view.episodeCount;
  watchedKeys.value = view.watchedKeys;
  episodeHydrationError.value = view.episodesError;
}

// Episodes hydrate off-request; poll until the catalog reports a settled state
// (anything but a bare stub), then stop.
const { start: startHydrationPoll } = useHydrationPoll<ShowViewDto>({
  fetch: fetchShowView,
  isDone: (view) => view.hydrationState !== "stub",
  onData: applyShowView,
});

const showAwaitingEpisodes = computed(
  () =>
    props.media.mediaType === "show" && seasons.value.length === 0 && !episodeHydrationError.value,
);

async function onLogEpisode(seasonNumber: number, episodeNumber: number) {
  const ok = await logEpisode(seasonNumber, episodeNumber);
  if (!ok) return;
  const k = `${seasonNumber}:${episodeNumber}`;
  if (!watchedKeys.value.includes(k)) watchedKeys.value = [...watchedKeys.value, k];
}

async function onQuickLogEpisode() {
  const ok = await logWatch();
  if (!ok) return;
  // A provisional quick-log on a not-yet-hydrated show: refresh once so watched
  // marks reflect the new event without waiting for the next poll tick.
  if (showAwaitingEpisodes.value) {
    try {
      applyShowView(await fetchShowView());
    } catch {
      // Transient; the background poll (if running) will catch up.
    }
  }
}

const {
  entry,
  saving,
  error: trackingError,
  displayScore,
  scoreMax,
  progressText,
  canLogEpisode,
  setStatus,
  setScore,
  logWatch,
  logEpisode,
} = useTracking({
  mediaId: props.media.id,
  mediaType: props.media.mediaType,
  episodeTotal,
  ratingSystem: props.ratingSystem,
  initialEntry: props.libraryEntry
    ? {
        id: props.libraryEntry.id,
        status: props.libraryEntry.status,
        score100: props.libraryEntry.score100,
        watchedEpisodeCount: props.watchedEpisodeCount,
        updatedAt: Date.now(),
      }
    : null,
});

const year = props.media.releaseDate ? new Date(props.media.releaseDate).getFullYear() : null;

const statusLabel = computed(() => mediaStatusLabel(props.media.status));
const runtimeText = computed(() => (props.media.runtime ? `${props.media.runtime} min` : null));
const networks = computed(() =>
  props.companies.filter((c) => c.kind === "network").map((c) => c.name),
);
const studios = computed(() =>
  props.companies.filter((c) => c.kind === "company").map((c) => c.name),
);
const language = computed(() => props.media.originalLanguage?.toUpperCase() ?? null);
const seasonsText = computed(() => {
  if (props.media.mediaType !== "show") return null;
  const parts: string[] = [];
  if (seasonCount.value) parts.push(`${seasonCount.value} seasons`);
  if (episodeTotal.value) parts.push(`${episodeTotal.value} episodes`);
  return parts.length > 0 ? parts.join(" · ") : null;
});
const airedText = computed(() => {
  const start = props.media.releaseDate;
  const end = props.media.lastAirDate;
  if (!start) return null;
  if (props.media.mediaType === "show" && end && end !== start) return `${start} → ${end}`;
  return start;
});
const showOtherTitles = ref(false);

const STATUS_ORDER: LibraryStatus[] = ["watching", "completed", "planned", "paused", "dropped"];
const statusColor: Record<LibraryStatus, string> = {
  watching: "bg-accent",
  completed: "bg-green-500",
  planned: "bg-fg-subtle",
  paused: "bg-yellow-500",
  dropped: "bg-red-500",
};

const showStats = computed(() => props.stats.trackedCount >= STATS_MIN_TRACKED);
const showTrackScore = computed(
  () => props.stats.scoreCount >= STATS_MIN_SCORES && props.stats.trackScore !== null,
);
const trackScore5 = computed(() =>
  props.stats.trackScore !== null ? (props.stats.trackScore / 20).toFixed(1) : null,
);
const statusBar = computed(() => {
  const total = props.stats.trackedCount || 1;
  return STATUS_ORDER.map((status) => ({
    status,
    count: props.stats.statusCounts[status],
    pct: (props.stats.statusCounts[status] / total) * 100,
  })).filter((seg) => seg.count > 0);
});

const statusClass: Record<LibraryStatus, string> = {
  planned: "badge-planned border",
  watching: "badge-watching border",
  completed: "badge-completed border",
  paused: "badge-paused border",
  dropped: "badge-dropped border",
};

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
    favPulse.value++;
  } catch (err) {
    favError.value = err instanceof Error ? err.message : "failed";
  } finally {
    addingFav.value = false;
  }
}

async function onStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const saved = await setStatus(target.value as LibraryStatus);
  if (!saved) target.value = entry.value?.status ?? "";
}

async function onScoreChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const saved = await setScore(Number(target.value));
  if (!saved) target.value = displayScore.value === null ? "" : String(displayScore.value);
}

onMounted(() => {
  if (showAwaitingEpisodes.value) startHydrationPoll();
});
</script>

<template>
  <div class="flex flex-col gap-10">
    <div
      v-if="media.backdropPath"
      class="relative -mx-4 sm:-mx-6 -mt-8 sm:-mt-12 h-52 sm:h-72 overflow-hidden rounded-b-2xl"
    >
      <img
        :src="tmdbImage(media.backdropPath, 'original')"
        :alt="`${media.title} backdrop`"
        class="w-full h-full object-cover object-top"
        loading="eager"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
    </div>

    <div class="flex flex-col sm:flex-row gap-8 motion-safe:animate-slide-up animate-fill-both">
      <div class="shrink-0 w-40 sm:w-48">
        <div class="poster-wrap relative">
          <img
            v-if="media.posterPath"
            :src="tmdbImage(media.posterPath, 'w500')"
            :alt="`${media.title} poster`"
            loading="eager"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-bg-elevated text-fg-subtle text-xs font-mono"
          >
            no poster
          </div>

          <!-- The library marker is non-clickable so it cannot compete with favorite. -->
          <div v-if="user" class="absolute top-2 left-2 flex items-center gap-1.5">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-colors focus-ring disabled:opacity-50"
              :class="
                favorited
                  ? 'border-red-500/40 bg-red-500/20 text-red-400'
                  : 'border-border bg-bg/70 text-fg-muted hover:bg-bg hover:text-fg'
              "
              :disabled="addingFav"
              :aria-pressed="favorited"
              :aria-label="favorited ? 'remove from favorites' : 'add to favorites'"
              @click="toggleFavorite"
            >
              <span
                :key="favPulse"
                class="i-lucide:heart w-4 h-4"
                :style="favAnimStyle"
                aria-hidden="true"
              />
            </button>
            <span
              v-if="entry"
              class="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg/70 text-fg-muted backdrop-blur-sm"
              title="in your library"
              aria-label="in your library"
            >
              <span class="i-lucide:library w-4 h-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-5 flex-1 min-w-0">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h1 class="text-3xl font-mono font-bold">{{ media.title }}</h1>
            <span
              class="shrink-0 text-xs font-mono lowercase px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-fg-muted"
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
            <span v-if="runtimeText" aria-hidden="true">·</span>
            <span v-if="runtimeText">{{ runtimeText }}</span>
            <span v-if="statusLabel" aria-hidden="true">·</span>
            <span v-if="statusLabel">{{ statusLabel }}</span>
          </div>

          <div v-if="genres.length" class="flex flex-wrap gap-1.5 mt-1">
            <span
              v-for="g in genres"
              :key="g.name"
              class="px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-xs text-fg-muted"
            >
              {{ g.name }}
            </span>
          </div>
        </div>

        <p v-if="media.tagline" class="text-fg-muted text-sm italic font-mono">
          {{ media.tagline }}
        </p>

        <p v-if="media.overview" class="text-fg-muted text-sm leading-relaxed max-w-prose">
          {{ media.overview }}
        </p>

        <!-- Setting status, rating, or watch progress registers the title in the library. -->
        <div v-if="user" class="flex flex-wrap items-end gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-mono text-fg-subtle">status</span>
            <select
              :value="entry?.status ?? ''"
              :disabled="saving"
              class="rounded-lg border text-sm font-mono px-3 py-2 outline-none transition-colors disabled:opacity-60 cursor-pointer"
              :class="
                entry ? statusClass[entry.status] : 'border-border bg-bg-subtle text-fg-muted'
              "
              aria-label="library status"
              @change="onStatusChange"
            >
              <option value="" disabled>not tracking</option>
              <option value="planned">planned</option>
              <option value="watching">watching</option>
              <option value="completed">completed</option>
              <option value="paused">paused</option>
              <option value="dropped">dropped</option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-mono text-fg-subtle">rating</span>
            <div class="flex items-center gap-1.5">
              <input
                type="number"
                :min="0"
                :max="scoreMax"
                :value="displayScore ?? ''"
                placeholder="0"
                :disabled="saving"
                class="w-16 bg-bg-subtle border border-border rounded-lg px-2.5 py-2 text-sm font-mono text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors disabled:opacity-60"
                aria-label="your rating"
                @change="onScoreChange"
              />
              <span class="text-xs font-mono text-fg-subtle">/ {{ scoreMax }}</span>
            </div>
          </label>

          <div class="flex flex-col gap-1">
            <span class="text-xs font-mono text-fg-subtle">
              {{ media.mediaType === "movie" ? "watch" : (progressText ?? "episodes") }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-fg px-3.5 py-2 text-sm font-mono text-bg transition-colors hover:bg-fg/80 disabled:opacity-60 focus-ring"
              :disabled="saving || (media.mediaType === 'show' && !canLogEpisode)"
              @click="media.mediaType === 'movie' ? logWatch() : onQuickLogEpisode()"
            >
              <span
                :class="media.mediaType === 'movie' ? 'i-lucide:check' : 'i-lucide:plus'"
                class="w-4 h-4"
                aria-hidden="true"
              />
              {{ saving ? "..." : media.mediaType === "movie" ? "log watch" : "+1 episode" }}
            </button>
          </div>
        </div>

        <a
          v-else
          href="/login"
          class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-subtle text-sm font-mono text-fg-muted hover:text-fg hover:border-border-hover transition-colors focus-ring"
        >
          <span class="i-lucide:log-in w-4 h-4" aria-hidden="true" />
          sign in to track
        </a>

        <p v-if="favError || trackingError" class="text-sm text-red-400 font-mono">
          {{ trackingError || favError }}
        </p>
      </div>
    </div>

    <MediaTabs :slug="media.slug" active="overview" />

    <section class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">details</h2>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm font-mono items-baseline">
        <template v-if="seasonsText">
          <dt class="text-fg-subtle">episodes</dt>
          <dd class="text-fg">{{ seasonsText }}</dd>
        </template>
        <template v-if="networks.length">
          <dt class="text-fg-subtle">network</dt>
          <dd class="text-fg">{{ networks.join(" · ") }}</dd>
        </template>
        <template v-if="studios.length">
          <dt class="text-fg-subtle">studios</dt>
          <dd class="text-fg">{{ studios.join(" · ") }}</dd>
        </template>
        <template v-if="language">
          <dt class="text-fg-subtle">language</dt>
          <dd class="text-fg">{{ language }}</dd>
        </template>
        <template v-if="airedText">
          <dt class="text-fg-subtle">aired</dt>
          <dd class="text-fg">{{ airedText }}</dd>
        </template>
        <template v-if="media.certification">
          <dt class="text-fg-subtle">rating</dt>
          <dd class="text-fg">{{ media.certification }}</dd>
        </template>
      </dl>

      <div v-if="altTitles.length" class="text-sm font-mono">
        <button
          type="button"
          class="flex items-center gap-1.5 text-fg-subtle hover:text-fg transition-colors"
          @click="showOtherTitles = !showOtherTitles"
        >
          <span
            class="w-3.5 h-3.5"
            :class="showOtherTitles ? 'i-lucide:chevron-down' : 'i-lucide:chevron-right'"
            aria-hidden="true"
          />
          other titles
        </button>
        <dl
          v-if="showOtherTitles"
          class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mt-2 pl-5"
        >
          <template v-for="t in altTitles" :key="t.languageCode">
            <dt class="text-fg-subtle uppercase">{{ t.languageCode }}</dt>
            <dd class="text-fg-muted">{{ t.title }}</dd>
          </template>
        </dl>
      </div>
    </section>

    <section v-if="media.mediaType === 'show'" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">episodes</h2>
      <EpisodeList
        :seasons="seasons"
        :watched-keys="watchedKeys"
        :can-log="canLogEpisodes"
        :saving="saving"
        @log="onLogEpisode"
      />
    </section>

    <section v-if="cast.length" class="flex flex-col gap-4">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">
          cast<span v-if="castTotal > cast.length" class="text-fg-subtle">
            · top {{ cast.length }}</span
          >
        </h2>
        <a
          v-if="castTotal > cast.length"
          :href="`/media/${media.slug}/cast`"
          class="text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
        >
          all {{ castTotal }} →
        </a>
      </div>
      <CreditNameList
        :items="cast.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sub: c.character }))"
      />
    </section>

    <section v-if="keyCrew.length" class="flex flex-col gap-4">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">crew</h2>
        <a
          v-if="crewTotal > keyCrew.length"
          :href="`/media/${media.slug}/crew`"
          class="text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
        >
          all {{ crewTotal }} →
        </a>
      </div>
      <CreditNameList
        :items="keyCrew.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sub: c.job }))"
      />
    </section>

    <section v-if="showStats" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">on track</h2>
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-4 text-sm font-mono">
          <span v-if="showTrackScore" class="text-fg">
            ★ {{ trackScore5 }}/5
            <span class="text-fg-subtle">({{ stats.scoreCount }})</span>
          </span>
          <span v-if="stats.favoriteCount > 0" class="text-fg-muted"
            >♥ {{ stats.favoriteCount }}</span
          >
          <span class="ml-auto text-fg-subtle">{{ stats.trackedCount }} tracking</span>
        </div>
        <div class="flex h-2 rounded-full overflow-hidden bg-bg-elevated">
          <div
            v-for="seg in statusBar"
            :key="seg.status"
            class="h-full"
            :class="statusColor[seg.status]"
            :style="{ width: `${seg.pct}%` }"
            :title="`${seg.status}: ${seg.count}`"
          />
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-fg-subtle">
          <span v-for="seg in statusBar" :key="seg.status" class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :class="statusColor[seg.status]" />
            {{ seg.status }} {{ seg.count }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* Heart toggle micro-animation. Unscoped so the inline `animation` reference on
   the favorite icon resolves to these global keyframe names. */
@keyframes heart-spring {
  0% {
    transform: scale(1);
  }
  15% {
    transform: scale(0.8);
  }
  45% {
    transform: scale(1.4);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes heart-settle {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(0.85);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes heart-spring {
    from,
    to {
      transform: scale(1);
    }
  }
  @keyframes heart-settle {
    from,
    to {
      transform: scale(1);
    }
  }
}
</style>
