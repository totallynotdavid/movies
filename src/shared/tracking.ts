// Isomorphic tracking vocabulary: the episode identity, the library status, and
// the DTOs the API and client both speak. No db, no domain imports, so this is
// the single owner of these shapes for server reads and client state alike.

import type { SeasonEpisodes } from "@/shared/catalog";
import type { HydrationState } from "@/shared/hydration";

// One owner of the "season:episode" key format. Templates, projections, and the
// derive core all route through this instead of re-spelling the separator.
export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

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
