import type { SeasonEpisodes } from "@/shared/catalog";
import type { HydrationState } from "@/shared/hydration";
import type { LibraryStatus } from "@/shared/library-status";

export type EpisodeRef = { seasonNumber: number; episodeNumber: number };

export function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

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

export type TrackedEntryDto = {
  id: string;
  filedStatus: LibraryStatus;
  score100: number | null;
  updatedAt: number;
};

export type ShowProgressDto = {
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
  nextEpisode: EpisodeRef | null;
  complete: boolean;
};

export type ShowViewDto = {
  seasons: SeasonEpisodes[];
  seasonCount: number | null;
  episodeCount: number | null;
  watchedKeys: string[];
  progress: ShowProgressDto;
  hydrationState: HydrationState;
  episodesError: string | null;
};
