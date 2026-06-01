// Normalized DTOs produced by the TMDB integration and consumed by domain upserts.
// Kept provider-neutral and DB-free so both layers can depend on them.

export type PersonStubInput = {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  gender: number | null;
  knownForDepartment: string | null;
  popularity: number | null;
};

export type CastInput = {
  creditId: string;
  personTmdbId: number;
  character: string | null;
  billingOrder: number | null;
  episodeCount: number | null;
};

export type CrewInput = {
  creditId: string;
  personTmdbId: number;
  department: string;
  // Non-empty by construction: the integration drops crew rows without a job
  // rather than persisting a blank label.
  job: string;
  episodeCount: number | null;
};

export type GenreInput = { tmdbId: number; name: string };

export type CompanyInput = {
  tmdbId: number;
  kind: "company" | "network";
  name: string;
  logoPath: string | null;
  originCountry: string | null;
};

export type AltTitleInput = { languageCode: string; title: string };

export type EpisodeInput = {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  runtime: number | null;
  airDate: string | null;
};

export type MediaDetailScalars = {
  title: string;
  originalTitle: string | null;
  overview: string | null;
  tagline: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  lastAirDate: string | null;
  runtime: number | null;
  seasonCount: number | null;
  episodeCount: number | null;
  status: string | null;
  inProduction: number | null;
  originalLanguage: string | null;
  certification: string | null;
  imdbId: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
};

export type MediaDetail = {
  scalars: MediaDetailScalars;
  genres: GenreInput[];
  companies: CompanyInput[];
  people: PersonStubInput[];
  cast: CastInput[];
  crew: CrewInput[];
  titles: AltTitleInput[];
  seasonNumbers: number[];
};

// Off-request hydration jobs. One queue, discriminated by kind: `media-details`
// is a stale/failed background refresh of Tier-1; `media-episodes` is the
// Tier-2 season fan-out.
export type MediaDetailsRefreshMessage = { kind: "media-details"; mediaId: string };

export type EpisodeHydrationMessage = {
  kind: "media-episodes";
  mediaId: string;
  tmdbId: number;
  seasonNumbers: number[];
};

export type HydrationMessage = MediaDetailsRefreshMessage | EpisodeHydrationMessage;

export type PersonScalars = {
  name: string;
  gender: number | null;
  knownForDepartment: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  biography: string | null;
  profilePath: string | null;
  popularity: number | null;
  imdbId: string | null;
};

export type FilmographyEntry = {
  // TMDB credit_id (stable per role, used as the view key).
  creditId: string;
  tmdbId: number;
  mediaType: "movie" | "show";
  title: string;
  subtitle: string | null;
  date: string | null;
  posterPath: string | null;
};

export type PersonCrewEntry = FilmographyEntry & { department: string };

export type PersonDetail = {
  scalars: PersonScalars;
  acting: FilmographyEntry[];
  crew: PersonCrewEntry[];
};
