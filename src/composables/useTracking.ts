import { computed, ref, unref, type Ref } from "vue";
import type { MediaType } from "@/domain/catalog/media";
import { toDisplayScore, scoreMax, toScore100, type RatingSystem } from "@/domain/rating";
import { useToast } from "@/composables/useToast";
import { trackingMessage } from "@/shared/tracking-messages";
import type { TrackedEntryDto } from "@/shared/tracking";
import { resolveStatus, type LibraryStatus } from "@/shared/library-status";

export type TrackedEntry = {
  id: string;
  filedStatus: LibraryStatus;
  score100: number | null;
  watchedEpisodeCount: number;
  updatedAt: number;
};

export type EntryUpdate = {
  id: string;
  filedStatus: LibraryStatus;
  status: LibraryStatus;
  score100: number | null;
  watchedEpisodeCount: number;
  updatedAt: number;
};

type TrackingResponse = {
  error?: { kind?: string };
  entry?: TrackedEntryDto;
  watchedEpisodeCount?: number;
};

type Options = {
  mediaId: string;
  mediaType: MediaType;
  episodeTotal: number | null | Ref<number | null>;
  ratingSystem: RatingSystem;
  initialEntry: TrackedEntry | null;
  onUpdate?: (entry: TrackedEntry) => void;
};

function readEntry(payload: TrackingResponse, prevCount: number): TrackedEntry {
  const entry = payload.entry!;
  return {
    id: entry.id,
    filedStatus: entry.filedStatus,
    score100: entry.score100,
    watchedEpisodeCount: payload.watchedEpisodeCount ?? prevCount,
    updatedAt: entry.updatedAt ?? Date.now(),
  };
}

const JSON_HEADERS = { "content-type": "application/json" };

export function useTracking(options: Options) {
  const toast = useToast();
  const entry: Ref<TrackedEntry | null> = ref(
    options.initialEntry ? { ...options.initialEntry } : null,
  );
  const saving = ref(false);

  const displayScore = computed(() => {
    const score100 = entry.value?.score100;
    if (score100 === null || score100 === undefined) return null;
    return toDisplayScore(score100, options.ratingSystem);
  });
  const episodeTotal = computed(() => unref(options.episodeTotal));
  const max = scoreMax(options.ratingSystem);

  const isComplete = computed(() => {
    const watched = entry.value?.watchedEpisodeCount ?? 0;
    if (options.mediaType === "movie") return watched > 0;
    return episodeTotal.value !== null && watched > 0 && watched >= episodeTotal.value;
  });

  const displayStatus = computed<LibraryStatus | null>(() => {
    if (!entry.value) return null;
    return resolveStatus(entry.value.filedStatus, {
      complete: isComplete.value,
      watchedCount: entry.value.watchedEpisodeCount,
    });
  });

  const progressText = computed(() => {
    if (!entry.value || options.mediaType !== "show") return null;
    if (episodeTotal.value !== null) {
      return `${entry.value.watchedEpisodeCount} / ${episodeTotal.value} episodes`;
    }
    return `${entry.value.watchedEpisodeCount} episodes`;
  });

  const canLogEpisode = computed(() => {
    if (options.mediaType !== "show") return false;
    // No entry yet means nothing is logged, so the next watch starts at episode 1;
    // logging is what registers the show, it does not require a prior entry.
    const watched = entry.value?.watchedEpisodeCount ?? 0;
    return episodeTotal.value === null || watched < episodeTotal.value;
  });

  function sync(next: TrackedEntry) {
    entry.value = next;
    options.onUpdate?.(next);
  }

  function snapshot(): TrackedEntry | null {
    return entry.value ? { ...entry.value } : null;
  }

  // Optimistic update so the most-repeated actions feel instant. A null entry
  // (an untracked title) starts from a provisional row the server later confirms.
  function applyOptimistic(patch: Partial<TrackedEntry>) {
    const base: TrackedEntry = entry.value ?? {
      id: "pending",
      filedStatus: "planned",
      score100: null,
      watchedEpisodeCount: 0,
      updatedAt: Date.now(),
    };
    sync({ ...base, ...patch, updatedAt: Date.now() });
  }

  function rollback(prev: TrackedEntry | null) {
    entry.value = prev;
    if (prev) options.onUpdate?.(prev);
  }

  function fail(caught: unknown): false {
    const kind = caught instanceof Error ? caught.message : "request failed";
    toast.error(trackingMessage(kind));
    return false;
  }

  // The one request seam: optimistic patch, send, reconcile or roll back, and
  // report failures through the toast channel. `clears` is the untrack case where
  // success drops the entry instead of syncing a returned one.
  async function mutate(opts: {
    method: "POST" | "DELETE";
    url: string;
    body: Record<string, unknown>;
    optimistic?: Partial<TrackedEntry>;
    clears?: boolean;
  }): Promise<boolean> {
    const prev = snapshot();
    if (opts.optimistic) applyOptimistic(opts.optimistic);
    saving.value = true;
    try {
      const res = await fetch(opts.url, {
        method: opts.method,
        headers: JSON_HEADERS,
        body: JSON.stringify(opts.body),
      });
      const payload = (await res.json().catch(() => ({}))) as TrackingResponse;
      if (!res.ok) throw new Error(payload.error?.kind ?? "request failed");
      if (opts.clears) {
        entry.value = null;
      } else {
        if (!payload.entry) throw new Error(payload.error?.kind ?? "request failed");
        sync(readEntry(payload, prev?.watchedEpisodeCount ?? 0));
      }
      return true;
    } catch (caught) {
      rollback(prev);
      return fail(caught);
    } finally {
      saving.value = false;
    }
  }

  function setStatus(filedStatus: LibraryStatus) {
    return mutate({
      method: "POST",
      url: "/api/tracking/library",
      body: { media: options.mediaId, status: filedStatus },
      optimistic: { filedStatus },
    });
  }

  function setScore(rawValue: number) {
    const score100 =
      !Number.isNaN(rawValue) && rawValue > 0 ? toScore100(rawValue, options.ratingSystem) : null;
    return mutate({
      method: "POST",
      url: "/api/tracking/library",
      body: { media: options.mediaId, score100 },
      optimistic: { score100 },
    });
  }

  function logWatch() {
    const watchedEpisodeCount =
      options.mediaType === "movie" ? 1 : (entry.value?.watchedEpisodeCount ?? 0) + 1;
    return mutate({
      method: "POST",
      url: "/api/tracking/watch",
      body: { media: options.mediaId },
      optimistic: { watchedEpisodeCount },
    });
  }

  // Explicit episode logging must not fall through to quick-log selection.
  function logEpisode(seasonNumber: number, episodeNumber: number) {
    return mutate({
      method: "POST",
      url: "/api/tracking/watch",
      body: { media: options.mediaId, seasonNumber, episodeNumber },
      optimistic: { watchedEpisodeCount: (entry.value?.watchedEpisodeCount ?? 0) + 1 },
    });
  }

  function unwatch(seasonNumber: number, episodeNumber: number) {
    const optimistic = entry.value
      ? { watchedEpisodeCount: Math.max(0, entry.value.watchedEpisodeCount - 1) }
      : undefined;
    return mutate({
      method: "DELETE",
      url: "/api/tracking/watch",
      body: { media: options.mediaId, seasonNumber, episodeNumber },
      optimistic,
    });
  }

  function untrack() {
    if (!entry.value) return Promise.resolve(true);
    return mutate({
      method: "DELETE",
      url: "/api/tracking/library",
      body: { media: options.mediaId },
      clears: true,
    });
  }

  return {
    entry,
    saving,
    displayStatus,
    displayScore,
    scoreMax: max,
    progressText,
    canLogEpisode,
    setStatus,
    setScore,
    logWatch,
    logEpisode,
    unwatch,
    untrack,
  };
}
