// Pure catalog view shapes, safe in any bundle. The catalog domain re-exports
// these so server reads and client props share one definition.

export type EpisodeRecord = {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  runtime: number | null;
  airDate: string | null;
};

export type SeasonEpisodes = {
  seasonNumber: number;
  episodes: EpisodeRecord[];
};
