import * as v from "valibot";
import { tmdbFetch } from "./client";
import { Id, NonEmptyStr, NullNum, NullStr, looseArray, parse } from "./parse";
import type {
  FilmographyEntry,
  PersonCrewEntry,
  PersonDetail,
} from "../../../shared/types/metadata";

// Credits carry a stable credit_id (the view key) and must be movie/tv; person
// credits and rows missing the id are dropped at parse.
const Credit = v.object({
  credit_id: NonEmptyStr,
  id: Id,
  media_type: v.picklist(["movie", "tv"]),
  title: NullStr,
  name: NullStr,
  character: NullStr,
  job: NullStr,
  department: NullStr,
  release_date: NullStr,
  first_air_date: NullStr,
  poster_path: NullStr,
});

const Person = v.object({
  name: NonEmptyStr,
  gender: NullNum,
  known_for_department: NullStr,
  birthday: NullStr,
  deathday: NullStr,
  place_of_birth: NullStr,
  biography: NullStr,
  profile_path: NullStr,
  popularity: NullNum,
  external_ids: v.optional(v.object({ imdb_id: NullStr }), { imdb_id: null }),
  combined_credits: v.optional(v.object({ cast: looseArray(Credit), crew: looseArray(Credit) }), {
    cast: [],
    crew: [],
  }),
});

type CreditPayload = v.InferOutput<typeof Credit>;

function base(credit: CreditPayload): FilmographyEntry | null {
  const title = credit.title ?? credit.name;
  if (!title) return null;
  return {
    creditId: credit.credit_id,
    tmdbId: credit.id,
    mediaType: credit.media_type === "tv" ? "show" : "movie",
    title,
    subtitle: null,
    date: credit.release_date ?? credit.first_air_date,
    posterPath: credit.poster_path,
  };
}

// Most recent first; undated entries sink to the bottom.
function byDateDesc(a: { date: string | null }, b: { date: string | null }) {
  return (b.date ?? "").localeCompare(a.date ?? "");
}

export async function fetchPersonDetail(tmdbId: number): Promise<PersonDetail> {
  const raw = await tmdbFetch<unknown>(`/person/${tmdbId}`, {
    append_to_response: "combined_credits,external_ids",
  });
  const person = parse(Person, raw);

  const acting: FilmographyEntry[] = person.combined_credits.cast
    .map((credit) => {
      const entry = base(credit);
      return entry ? { ...entry, subtitle: credit.character } : null;
    })
    .filter((entry): entry is FilmographyEntry => entry !== null)
    .sort(byDateDesc);

  const crew: PersonCrewEntry[] = person.combined_credits.crew
    .map((credit) => {
      const entry = base(credit);
      if (!entry) return null;
      return { ...entry, subtitle: credit.job, department: credit.department ?? "Crew" };
    })
    .filter((entry): entry is PersonCrewEntry => entry !== null)
    .sort(byDateDesc);

  return {
    scalars: {
      name: person.name,
      gender: person.gender,
      knownForDepartment: person.known_for_department,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.place_of_birth,
      biography: person.biography,
      profilePath: person.profile_path,
      popularity: person.popularity,
      imdbId: person.external_ids.imdb_id,
    },
    acting,
    crew,
  };
}
