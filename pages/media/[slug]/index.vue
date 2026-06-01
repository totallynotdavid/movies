<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Props } from "./index.server";
import { mediaStatusLabel } from "@/domain/catalog/media";
import { STATS_MIN_SCORES, STATS_MIN_TRACKED } from "@/domain/insights/title-stats";
import { useTracking } from "@/composables/useTracking";
import { useHydrationPoll } from "@/composables/useHydrationPoll";
import PersonCredit from "@/components/PersonCredit.vue";
import EpisodeList from "@/components/EpisodeList.vue";
import { tmdbImage } from "@/components/tmdb-image";
import type { SeasonEpisodes } from "@/domain/catalog/episodes";
import type { LibraryStatus, ShowViewDto } from "@/shared/tracking";

const props = defineProps<Props>();

const favorited = ref(props.isFavorited);
const addingFav = ref(false);
const favError = ref("");
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
  addToLibrary: addToLibraryEntry,
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
const creditsHref = computed(() => `/media/${props.media.slug}/credits`);
const showOtherTitles = ref(false);

function episodeCaption(episodeCount: number | null): string | null {
  if (props.media.mediaType !== "show" || !episodeCount) return null;
  return `${episodeCount} episode${episodeCount > 1 ? "s" : ""}`;
}

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
  } catch (err) {
    favError.value = err instanceof Error ? err.message : "failed";
  } finally {
    addingFav.value = false;
  }
}

function addToLibrary() {
  if (!props.user) {
    window.location.href = "/login";
    return;
  }
  return addToLibraryEntry();
}

async function onStatusChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const saved = await setStatus(target.value as LibraryStatus);
  if (!saved && entry.value) target.value = entry.value.status;
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
        <div class="poster-wrap">
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
        </div>
      </div>

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
            <span v-if="runtimeText" aria-hidden="true">·</span>
            <span v-if="runtimeText">{{ runtimeText }}</span>
            <span v-if="statusLabel" aria-hidden="true">·</span>
            <span v-if="statusLabel">{{ statusLabel }}</span>
          </div>
        </div>

        <p v-if="media.tagline" class="text-fg-muted text-sm italic font-mono">
          {{ media.tagline }}
        </p>

        <p v-if="media.overview" class="text-fg-muted text-sm leading-relaxed max-w-prose">
          {{ media.overview }}
        </p>

        <div
          v-if="entry"
          class="flex flex-col gap-3 p-4 rounded-xl border border-border bg-bg-subtle"
        >
          <div class="flex items-center gap-2 text-xs font-mono text-fg-subtle">
            <span class="i-lucide:library w-3.5 h-3.5" aria-hidden="true" />
            in your library
          </div>

          <div class="flex flex-wrap gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-fg-subtle">status</label>
              <select
                :value="entry.status"
                :disabled="saving"
                class="rounded-lg border text-xs font-mono px-2.5 py-1.5 outline-none transition-colors disabled:opacity-60 cursor-pointer bg-bg-elevated text-fg"
                :class="statusClass[entry.status]"
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

            <div class="flex flex-col gap-1">
              <label class="text-xs font-mono text-fg-subtle">rating</label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  :min="0"
                  :max="scoreMax"
                  :value="displayScore ?? ''"
                  :placeholder="`0`"
                  :disabled="saving"
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
              :disabled="saving"
              @click="logWatch"
            >
              <span class="i-lucide:check w-3.5 h-3.5" aria-hidden="true" />
              {{ saving ? "..." : "log watch" }}
            </button>
          </div>

          <div
            v-else
            class="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2"
          >
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-xs font-mono text-fg-subtle">episode progress</span>
              <span class="text-sm font-mono text-fg">{{ progressText }}</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-mono text-fg transition-colors hover:bg-accent/15 disabled:opacity-60 focus-ring"
              :disabled="saving || !canLogEpisode"
              @click="onQuickLogEpisode"
            >
              <span class="i-lucide:plus w-3.5 h-3.5" aria-hidden="true" />
              {{ saving ? "..." : "+1 episode" }}
            </button>
          </div>

          <a
            href="/library"
            class="text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
          >
            manage in library →
          </a>
        </div>

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

    <section class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">details</h2>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm font-mono items-baseline">
        <template v-if="genres.length">
          <dt class="text-fg-subtle">genres</dt>
          <dd class="flex flex-wrap gap-1.5">
            <span
              v-for="g in genres"
              :key="g.name"
              class="px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-xs text-fg-muted"
            >
              {{ g.name }}
            </span>
          </dd>
        </template>
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
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">cast</h2>
        <a
          v-if="castTotal > cast.length"
          :href="creditsHref"
          class="text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
        >
          show all {{ castTotal }} →
        </a>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-5">
        <PersonCredit
          v-for="c in cast"
          :key="c.id"
          :name="c.name"
          :profile-path="c.profilePath"
          :subtitle="c.character"
          :caption="episodeCaption(c.episodeCount)"
          :href="`/person/${c.slug}`"
        />
      </div>
    </section>

    <section v-if="keyCrew.length" class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">crew</h2>
        <a
          v-if="crewTotal > keyCrew.length"
          :href="creditsHref"
          class="text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
        >
          show all {{ crewTotal }} →
        </a>
      </div>
      <div class="flex flex-wrap gap-x-8 gap-y-3 text-sm font-mono">
        <div v-for="c in keyCrew" :key="c.id" class="flex flex-col">
          <a :href="`/person/${c.slug}`" class="text-fg hover:text-accent transition-colors">
            {{ c.name }}
          </a>
          <span class="text-fg-subtle text-xs">{{ c.job }}</span>
        </div>
      </div>
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
