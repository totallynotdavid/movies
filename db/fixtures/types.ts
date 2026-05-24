export type MediaFixture = {
  id: string;
  mediaType: "movie" | "show";
  provider: string;
  providerId: number;
  slug: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
};
