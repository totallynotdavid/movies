export type MediaFixture = {
  id: string;
  mediaType: "movie" | "show";
  tmdbId: number;
  slug: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  seasonCount?: number | null;
  episodeCount?: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
};
