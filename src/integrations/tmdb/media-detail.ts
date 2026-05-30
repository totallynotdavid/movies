import * as v from "valibot";
import { tmdbFetch } from "./client";
import { Id, NonEmptyStr, NullNum, NullStr, looseArray, parse } from "./parse";
import type {
  AltTitleInput,
  CastInput,
  CompanyInput,
  CrewInput,
  GenreInput,
  MediaDetail,
  PersonStubInput,
} from "../../../shared/types/metadata";

// Localized titles we keep; the source title's own language is added on top.
const TITLE_LANGUAGES = ["es", "zh", "ja", "ko", "fr", "de"];

// aggregate_credits are per-CHARACTER and dominated by single-episode guests
// (Grey's lists 3000+, ~2600 one-off); voice-heavy shows further multiply rows
// per person (Simpsons actors hold ~10 each). We keep the most-present cast
// credit ROWS by episode count, main + recurring characters, all the credits
// page and wrapped consume, which bounds the hydration batch by construction
// (uncapped it hit ~700 statements). Capping by row, not by person, is what
// keeps voice/sketch shows bounded too. One-off guests are recovered lazily via
// the per-episode credit graph. Movies are not capped.
const TV_CAST_LIMIT = 100;

// --- Projection schemas (only the fields we consume; extras are ignored). A
// row missing a required field is dropped by looseArray, so blank-job crew and
// nameless people never reach the domain.

const personRef = {
  id: Id,
  name: NonEmptyStr,
  profile_path: NullStr,
  gender: NullNum,
  known_for_department: NullStr,
  popularity: NullNum,
};

const Genre = v.object({ id: Id, name: NonEmptyStr });
const Company = v.object({
  id: Id,
  name: NonEmptyStr,
  logo_path: NullStr,
  origin_country: NullStr,
});
const Translation = v.object({
  iso_639_1: NonEmptyStr,
  data: v.optional(v.object({ title: NullStr, name: NullStr }), { title: null, name: null }),
});
const Translations = v.optional(v.object({ translations: looseArray(Translation) }), {
  translations: [],
});

const MovieCast = v.object({
  ...personRef,
  credit_id: NonEmptyStr,
  character: NullStr,
  order: NullNum,
});
const MovieCrew = v.object({
  ...personRef,
  credit_id: NonEmptyStr,
  department: NonEmptyStr,
  job: NonEmptyStr,
});

const MovieDetail = v.object({
  id: Id,
  title: NonEmptyStr,
  original_title: NullStr,
  overview: NullStr,
  tagline: NullStr,
  poster_path: NullStr,
  backdrop_path: NullStr,
  release_date: NullStr,
  runtime: NullNum,
  status: NullStr,
  original_language: NullStr,
  imdb_id: NullStr,
  vote_average: NullNum,
  vote_count: NullNum,
  popularity: NullNum,
  genres: looseArray(Genre),
  production_companies: looseArray(Company),
  credits: v.optional(v.object({ cast: looseArray(MovieCast), crew: looseArray(MovieCrew) }), {
    cast: [],
    crew: [],
  }),
  translations: Translations,
  release_dates: v.optional(
    v.object({
      results: looseArray(
        v.object({
          iso_3166_1: NonEmptyStr,
          release_dates: looseArray(v.object({ certification: NullStr })),
        }),
      ),
    }),
    { results: [] },
  ),
});

const AggregateRole = v.object({
  credit_id: NonEmptyStr,
  character: NullStr,
  episode_count: NullNum,
});
const AggregateCast = v.object({ ...personRef, order: NullNum, roles: looseArray(AggregateRole) });
const AggregateJob = v.object({ credit_id: NonEmptyStr, job: NonEmptyStr, episode_count: NullNum });
const AggregateCrew = v.object({
  ...personRef,
  department: NonEmptyStr,
  jobs: looseArray(AggregateJob),
});

const TvDetail = v.object({
  id: Id,
  name: NonEmptyStr,
  original_name: NullStr,
  overview: NullStr,
  tagline: NullStr,
  poster_path: NullStr,
  backdrop_path: NullStr,
  first_air_date: NullStr,
  last_air_date: NullStr,
  number_of_seasons: NullNum,
  number_of_episodes: NullNum,
  status: NullStr,
  in_production: v.optional(v.boolean(), false),
  original_language: NullStr,
  vote_average: NullNum,
  vote_count: NullNum,
  popularity: NullNum,
  genres: looseArray(Genre),
  production_companies: looseArray(Company),
  networks: looseArray(Company),
  seasons: looseArray(v.object({ season_number: NullNum })),
  aggregate_credits: v.optional(
    v.object({ cast: looseArray(AggregateCast), crew: looseArray(AggregateCrew) }),
    { cast: [], crew: [] },
  ),
  translations: Translations,
  content_ratings: v.optional(
    v.object({ results: looseArray(v.object({ iso_3166_1: NonEmptyStr, rating: NullStr })) }),
    { results: [] },
  ),
  external_ids: v.optional(v.object({ imdb_id: NullStr }), { imdb_id: null }),
});

const PersonRefSchema = v.object(personRef);
type PersonRef = v.InferOutput<typeof PersonRefSchema>;
type TranslationsPayload = v.InferOutput<typeof Translations>;

function toPersonStub(p: PersonRef): PersonStubInput {
  return {
    tmdbId: p.id,
    name: p.name,
    profilePath: p.profile_path,
    gender: p.gender,
    knownForDepartment: p.known_for_department,
    popularity: p.popularity,
  };
}

function toGenres(items: { id: number; name: string }[]): GenreInput[] {
  return items.map((g) => ({ tmdbId: g.id, name: g.name }));
}

function toCompanies(
  items: { id: number; name: string; logo_path: string | null; origin_country: string | null }[],
  kind: "company" | "network",
): CompanyInput[] {
  return items.map((c) => ({
    tmdbId: c.id,
    kind,
    name: c.name,
    logoPath: c.logo_path,
    originCountry: c.origin_country,
  }));
}

function uniquePeople(people: PersonStubInput[]): PersonStubInput[] {
  return Array.from(new Map(people.map((p) => [p.tmdbId, p])).values());
}

function pickTitles(
  translations: TranslationsPayload,
  originalLanguage: string | null,
): AltTitleInput[] {
  const wanted = new Set(TITLE_LANGUAGES);
  if (originalLanguage) wanted.add(originalLanguage);
  wanted.delete("en");

  const byLanguage = new Map<string, string>();
  for (const t of translations.translations) {
    if (!wanted.has(t.iso_639_1) || byLanguage.has(t.iso_639_1)) continue;
    const title = t.data.title ?? t.data.name;
    if (title) byLanguage.set(t.iso_639_1, title);
  }

  return Array.from(byLanguage, ([languageCode, title]) => ({ languageCode, title }));
}

export async function fetchMovieDetail(tmdbId: number): Promise<MediaDetail> {
  const raw = await tmdbFetch<unknown>(`/movie/${tmdbId}`, {
    append_to_response: "credits,translations,release_dates",
  });
  const movie = parse(MovieDetail, raw);

  const cast: CastInput[] = movie.credits.cast.map((c) => ({
    creditId: c.credit_id,
    personTmdbId: c.id,
    character: c.character,
    billingOrder: c.order,
    episodeCount: null,
  }));
  const crew: CrewInput[] = movie.credits.crew.map((c) => ({
    creditId: c.credit_id,
    personTmdbId: c.id,
    department: c.department,
    job: c.job,
    episodeCount: null,
  }));

  const certification =
    movie.release_dates.results
      .find((r) => r.iso_3166_1 === "US")
      ?.release_dates.map((d) => d.certification)
      .find((c) => c !== null) ?? null;

  return {
    scalars: {
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview,
      tagline: movie.tagline,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date,
      lastAirDate: null,
      runtime: movie.runtime,
      seasonCount: null,
      episodeCount: null,
      status: movie.status,
      inProduction: null,
      originalLanguage: movie.original_language,
      certification,
      imdbId: movie.imdb_id,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
    },
    genres: toGenres(movie.genres),
    companies: toCompanies(movie.production_companies, "company"),
    people: uniquePeople([...movie.credits.cast, ...movie.credits.crew].map(toPersonStub)),
    cast,
    crew,
    titles: pickTitles(movie.translations, movie.original_language),
    seasonNumbers: [],
  };
}

export async function fetchShowDetail(tmdbId: number): Promise<MediaDetail> {
  const raw = await tmdbFetch<unknown>(`/tv/${tmdbId}`, {
    append_to_response: "aggregate_credits,translations,content_ratings,external_ids",
  });
  const show = parse(TvDetail, raw);

  // Flatten per-character role rows, then cap by episode count (see
  // TV_CAST_LIMIT). People stubs derive from the surviving rows, so dropped
  // guests are not persisted.
  const topCast = show.aggregate_credits.cast
    .flatMap((person) => person.roles.map((role) => ({ person, role })))
    .sort((a, b) => (b.role.episode_count ?? 0) - (a.role.episode_count ?? 0))
    .slice(0, TV_CAST_LIMIT);

  const cast: CastInput[] = topCast.map(({ person, role }) => ({
    creditId: role.credit_id,
    personTmdbId: person.id,
    character: role.character,
    billingOrder: person.order,
    episodeCount: role.episode_count,
  }));
  const crew: CrewInput[] = show.aggregate_credits.crew.flatMap((person) =>
    person.jobs.map((job) => ({
      creditId: job.credit_id,
      personTmdbId: person.id,
      department: person.department,
      job: job.job,
      episodeCount: job.episode_count,
    })),
  );

  const certification =
    show.content_ratings.results.find((r) => r.iso_3166_1 === "US")?.rating ?? null;

  return {
    scalars: {
      title: show.name,
      originalTitle: show.original_name,
      overview: show.overview,
      tagline: show.tagline,
      posterPath: show.poster_path,
      backdropPath: show.backdrop_path,
      releaseDate: show.first_air_date,
      lastAirDate: show.last_air_date,
      runtime: null,
      seasonCount: show.number_of_seasons,
      episodeCount: show.number_of_episodes,
      status: show.status,
      inProduction: show.in_production ? 1 : 0,
      originalLanguage: show.original_language,
      certification,
      imdbId: show.external_ids.imdb_id,
      voteAverage: show.vote_average,
      voteCount: show.vote_count,
      popularity: show.popularity,
    },
    genres: toGenres(show.genres),
    companies: [
      ...toCompanies(show.production_companies, "company"),
      ...toCompanies(show.networks, "network"),
    ],
    people: uniquePeople(
      [...topCast.map((c) => c.person), ...show.aggregate_credits.crew].map(toPersonStub),
    ),
    cast,
    crew,
    titles: pickTitles(show.translations, show.original_language),
    seasonNumbers: show.seasons
      .map((s) => s.season_number)
      .filter((n): n is number => n !== null && n >= 1),
  };
}
