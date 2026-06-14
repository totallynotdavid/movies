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

export type MediaSummary = {
  id: string;
  slug: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  seasonCount: number | null;
  episodeCount: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  status: string | null;
  tagline: string | null;
  overview: string | null;
};
