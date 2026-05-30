import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { favoritePeople } from "../../db/schema";
import { findPersonBySlug } from "../../src/domain/people";
import { findMediaByTmdbIds } from "../../src/domain/media";
import { groupByDepartment } from "../../src/domain/credits";
import { ensurePersonDetails } from "../../src/services/person-hydration";
import type { FilmographyEntry } from "../../shared/types/metadata";

export type Props = InferProps<typeof loader>;

type FilmographyView = {
  key: string;
  title: string;
  subtitle: string | null;
  year: string | null;
  posterPath: string | null;
  mediaType: "movie" | "show";
  slug: string | null;
};

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const user = getUser();

  const existing = await findPersonBySlug(slug);
  if (!existing) return c.notFound();

  const { person, acting, crew } = await ensurePersonDetails(existing);

  // Link filmography entries that exist in our catalog to their media page.
  const entries = [...acting, ...crew];
  const catalogRows =
    entries.length > 0
      ? await findMediaByTmdbIds(entries.map((e) => ({ mediaType: e.mediaType, tmdbId: e.tmdbId })))
      : [];
  const slugByKey = new Map(catalogRows.map((r) => [`${r.mediaType}:${r.tmdbId}`, r.slug]));

  const toView = (e: FilmographyEntry): FilmographyView => ({
    key: e.creditId,
    title: e.title,
    subtitle: e.subtitle,
    year: e.date ? e.date.slice(0, 4) : null,
    posterPath: e.posterPath,
    mediaType: e.mediaType,
    slug: slugByKey.get(`${e.mediaType}:${e.tmdbId}`) ?? null,
  });

  const crewGroups = groupByDepartment(crew).map(({ department, members }) => ({
    department,
    items: members.map(toView),
  }));

  let isFavorited = false;
  if (user) {
    const favRows = await db
      .select()
      .from(favoritePeople)
      .where(and(eq(favoritePeople.userId, user.id), eq(favoritePeople.personId, person.id)))
      .limit(1);
    isFavorited = favRows.length > 0;
  }

  return {
    person: {
      id: person.id,
      name: person.name,
      profilePath: person.profilePath,
      gender: person.gender,
      knownForDepartment: person.knownForDepartment,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.placeOfBirth,
      biography: person.biography,
    },
    acting: acting.map(toView),
    crewGroups,
    isFavorited,
    user: user ?? null,
  };
});
