// Isomorphic tracking DTOs. Keep this file free of db and domain imports.

import type { SeasonEpisodes } from "@/shared/catalog";
import type { HydrationState } from "@/shared/hydration";

// One owner of the "season:episode" key format. Templates, projections, and the
// derive core all route through this instead of re-spelling the separator.
export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

// A title the user can act on: either a catalog id (already cached) or a search
// candidate the server caches on demand. One owner of the wire shape the client
// sends to the tracking endpoints and the server resolves through resolveMediaId.
export type MediaSearchCandidate = {
  mediaType: "movie" | "show";
  tmdbId: number;
  title: string;
  slug: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  popularity?: number | null;
  cachedMediaId?: string | null;
};

export type MediaRef = string | MediaSearchCandidate;

export type LibraryStatus = "planned" | "watching" | "completed" | "paused" | "dropped";

const libraryStatuses: readonly LibraryStatus[] = [
  "planned",
  "watching",
  "completed",
  "paused",
  "dropped",
];

export function parseLibraryStatus(value: unknown): LibraryStatus | null {
  if (typeof value !== "string") return null;
  return libraryStatuses.find((status) => status === value) ?? null;
}

// What the client mirrors of a library entry. The server returns a wider record;
// the client only ever reads these fields.
export type TrackedEntryDto = {
  id: string;
  status: LibraryStatus;
  score100: number | null;
  updatedAt: number;
};

export type ShowProgressDto = {
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
  nextEpisode: EpisodeRef | null;
  complete: boolean;
};

// The show page's per-load read, shared by the SSR loader and the poll route.
export type ShowViewDto = {
  seasons: SeasonEpisodes[];
  seasonCount: number | null;
  episodeCount: number | null;
  watchedKeys: string[];
  progress: ShowProgressDto;
  hydrationState: HydrationState;
  episodesError: string | null;
};
