export type SeedMediaType = "movie" | "show";

export interface SeedMediaEntity {
  id: string;
  type: SeedMediaType;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  genreIds: number[];
  genreNames: string[];
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  fetchedAt: string;
}

export interface MediaSeedCatalog {
  version: number;
  generatedAt: string;
  source: "tmdb";
  counts: {
    movies: number;
    shows: number;
  };
  entries: SeedMediaEntity[];
}
