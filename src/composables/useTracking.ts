import { computed, ref, unref, type Ref } from "vue";
import type { MediaType } from "@/domain/catalog/media";
import { toDisplayScore, scoreMax, toScore100, type RatingSystem } from "@/domain/rating";
import type { LibraryStatus, TrackedEntryDto } from "@/shared/tracking";

export type TrackedEntry = {
  id: string;
  status: LibraryStatus;
  score100: number | null;
  watchedEpisodeCount: number;
  updatedAt: number;
};

// Episode progress is derived server-side and returned alongside the entry only
// when it changes (recording a watch); intent posts omit it.
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

const ERROR_MESSAGES: Record<string, string> = {
  already_at_episode_total: "You've already logged every episode.",
};

function friendlyError(kind: string): string {
  return ERROR_MESSAGES[kind] ?? kind;
}

function readEntry(payload: TrackingResponse, prevCount: number): TrackedEntry {
  const entry = payload.entry!;
  return {
    id: entry.id,
    status: entry.status,
    score100: entry.score100,
    watchedEpisodeCount: payload.watchedEpisodeCount ?? prevCount,
    updatedAt: entry.updatedAt ?? Date.now(),
  };
}

export function useTracking(options: Options) {
  const entry: Ref<TrackedEntry | null> = ref(
    options.initialEntry ? { ...options.initialEntry } : null,
  );
  const saving = ref(false);
  const error = ref("");

  const displayScore = computed(() => {
    const score100 = entry.value?.score100;
    if (score100 === null || score100 === undefined) return null;
    return toDisplayScore(score100, options.ratingSystem);
  });
  const episodeTotal = computed(() => unref(options.episodeTotal));

  const max = scoreMax(options.ratingSystem);

  const progressText = computed(() => {
    if (!entry.value || options.mediaType !== "show") return null;
    if (episodeTotal.value !== null) {
      return `${entry.value.watchedEpisodeCount} / ${episodeTotal.value} episodes`;
    }
    return `${entry.value.watchedEpisodeCount} episodes`;
  });

  const canLogEpisode = computed(() => {
    if (!entry.value || options.mediaType !== "show") return false;
    return episodeTotal.value === null || entry.value.watchedEpisodeCount < episodeTotal.value;
  });

  function sync(next: TrackedEntry) {
    entry.value = next;
    options.onUpdate?.(next);
  }

  async function post(url: string, body: Record<string, unknown>): Promise<boolean> {
    saving.value = true;
    error.value = "";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as TrackingResponse;
      if (!res.ok || !payload.entry) {
        throw new Error(payload.error?.kind ?? "request failed");
      }
      sync(readEntry(payload, entry.value?.watchedEpisodeCount ?? 0));
      return true;
    } catch (caught) {
      const kind = caught instanceof Error ? caught.message : "request failed";
      error.value = friendlyError(kind);
      return false;
    } finally {
      saving.value = false;
    }
  }

  function addToLibrary() {
    return post("/api/tracking/library", { mediaId: options.mediaId, status: "planned" });
  }

  function setStatus(status: LibraryStatus) {
    return post("/api/tracking/library", {
      mediaId: options.mediaId,
      status,
      score100: entry.value?.score100 ?? null,
    });
  }

  function setScore(rawValue: number) {
    const score100 =
      !Number.isNaN(rawValue) && rawValue > 0 ? toScore100(rawValue, options.ratingSystem) : null;
    return post("/api/tracking/library", {
      mediaId: options.mediaId,
      status: entry.value?.status ?? "planned",
      score100,
    });
  }

  // Records a watch: a movie completes, a show quick-logs the next aired episode.
  function logWatch() {
    return post("/api/tracking/watch", { mediaId: options.mediaId });
  }

  // Log a specific episode (the picker path), as opposed to quick-logging the
  // next aired one. Updates the shared entry + derived episode count.
  function logEpisode(seasonNumber: number, episodeNumber: number) {
    return post("/api/tracking/watch", {
      mediaId: options.mediaId,
      seasonNumber,
      episodeNumber,
    });
  }

  return {
    entry,
    saving,
    error,
    displayScore,
    scoreMax: max,
    progressText,
    canLogEpisode,
    addToLibrary,
    setStatus,
    setScore,
    logWatch,
    logEpisode,
  };
}
