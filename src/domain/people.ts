import { eq, sql } from "drizzle-orm";
import { db } from "void/db";
import { people } from "../../db/schema";
import { insertChunks, type Statement } from "../db/kernel";
import { slugify } from "../../shared/slug";
import type { PersonScalars, PersonStubInput } from "../../shared/types/metadata";

export type PersonRecord = typeof people.$inferSelect;

// TMDB gender codes.
export type Gender = 0 | 1 | 2 | 3;

const GENDER_LABELS: Record<Gender, string | null> = {
  0: null, // not set / not specified
  1: "Female",
  2: "Male",
  3: "Non-binary",
};

export function genderLabel(code: number | null): string | null {
  if (code === null) return null;
  return GENDER_LABELS[code as Gender] ?? null;
}

export function toPersonId(tmdbId: number) {
  return `tmdb:person:${tmdbId}`;
}

// Creates or refreshes the lightweight fields available from a credit payload.
// Hydrated fields (biography, birthday, ...) are filled later on person-page view.
export function personStubsWrite(stubs: PersonStubInput[]): Statement[] {
  if (stubs.length === 0) return [];
  const now = Date.now();
  const unique = Array.from(new Map(stubs.map((s) => [s.tmdbId, s])).values());
  const rows = unique.map((s) => ({
    id: toPersonId(s.tmdbId),
    tmdbId: s.tmdbId,
    slug: slugify(s.name, s.tmdbId),
    name: s.name,
    gender: s.gender,
    knownForDepartment: s.knownForDepartment,
    profilePath: s.profilePath,
    popularity: s.popularity,
    createdAt: now,
    updatedAt: now,
  }));

  return insertChunks(rows, (part) =>
    db
      .insert(people)
      .values(part)
      .onConflictDoUpdate({
        target: people.tmdbId,
        set: {
          name: sql`excluded.name`,
          gender: sql`excluded.gender`,
          knownForDepartment: sql`excluded.known_for_department`,
          profilePath: sql`excluded.profile_path`,
          popularity: sql`excluded.popularity`,
          updatedAt: now,
        },
      }),
  );
}

export async function findPersonBySlug(slug: string): Promise<PersonRecord | null> {
  const rows = await db.select().from(people).where(eq(people.slug, slug)).limit(1);
  return rows[0] ?? null;
}

// Fills the hydrated bio fields on first person-page view. Keeps an existing
// profile image if TMDB returns none. Stamps freshness and clears any prior
// error in the same statement.
export function personScalarsWrite(personId: string, scalars: PersonScalars): Statement[] {
  const now = Date.now();
  return [
    db
      .update(people)
      .set({
        name: scalars.name,
        gender: scalars.gender,
        knownForDepartment: scalars.knownForDepartment,
        birthday: scalars.birthday,
        deathday: scalars.deathday,
        placeOfBirth: scalars.placeOfBirth,
        biography: scalars.biography,
        popularity: scalars.popularity,
        imdbId: scalars.imdbId,
        ...(scalars.profilePath ? { profilePath: scalars.profilePath } : {}),
        detailsHydratedAt: now,
        detailsError: null,
        updatedAt: now,
      })
      .where(eq(people.id, personId)),
  ];
}

export function markPersonDetailsFailedWrite(personId: string, error: string): Statement[] {
  const now = Date.now();
  return [
    db.update(people).set({ detailsError: error, updatedAt: now }).where(eq(people.id, personId)),
  ];
}
