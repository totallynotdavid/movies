import { computed, ref, type Ref } from "vue";
import type { LibraryStatus } from "../domain/library";
import type { MediaType } from "../domain/media";
import { toDisplayScore, scoreMax, toScore100, type RatingSystem } from "../domain/rating";

export type TrackedEntry = {
  id: string;
  status: LibraryStatus;
  score100: number | null;
  episodesWatched: number;
  updatedAt: number;
};

type ServerEntry = Omit<TrackedEntry, "updatedAt"> & { updatedAt?: number };
type TrackingResponse = { error?: { kind?: string }; entry?: ServerEntry };

type Options = {
  mediaId: string;
  mediaType: MediaType;
  episodeTotal: number | null;
  ratingSystem: RatingSystem;
  initialEntry: TrackedEntry | null;
  onUpdate?: (entry: TrackedEntry) => void;
};

function readEntry(entry: ServerEntry): TrackedEntry {
  return {
    id: entry.id,
    status: entry.status,
    score100: entry.score100,
    episodesWatched: entry.episodesWatched,
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

  const max = scoreMax(options.ratingSystem);

  const progressText = computed(() => {
    if (!entry.value || options.mediaType !== "show") return null;
    if (options.episodeTotal !== null) {
      return `${entry.value.episodesWatched} / ${options.episodeTotal} episodes`;
    }
    return `${entry.value.episodesWatched} episodes`;
  });

  const canLogEpisode = computed(() => {
    if (!entry.value || options.mediaType !== "show") return false;
    return options.episodeTotal === null || entry.value.episodesWatched < options.episodeTotal;
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
      sync(readEntry(payload.entry));
      return true;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "request failed";
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

  function logWatch() {
    const url =
      options.mediaType === "movie" ? "/api/tracking/movie-watch" : "/api/tracking/show-episode";
    return post(url, { mediaId: options.mediaId });
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
  };
}
