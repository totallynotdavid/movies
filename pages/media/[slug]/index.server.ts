import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia } from "../../../db/schema";
import { findMediaBySlug } from "../../../src/domain/media";
import { findEntry, type LibraryEntryRecord } from "../../../src/domain/library";
import { getUserSettings } from "../../../src/domain/user";
import { ensureMediaDetails } from "../../../src/services/media-hydration";
import { countCast, countCrew, listCast, listKeyCrew } from "../../../src/domain/credits";
import {
  listMediaCompanies,
  listMediaGenres,
  listMediaTitles,
} from "../../../src/domain/media-metadata";
import { getMediaStats } from "../../../src/domain/media-stats";
import type { RatingSystem } from "../../../src/domain/rating";

const CAST_PREVIEW = 12;

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const user = getUser();

  const found = await findMediaBySlug(slug);

  if (!found) {
    return c.notFound();
  }

  // State-keyed hydration: block only when the entity is a bare stub; serve
  // stale/failed data immediately and refresh off-request. The service owns the
  // failure model, so the loader never swallows or re-reads by hand.
  const item = await ensureMediaDetails(found);

  const [genres, companies, altTitles, cast, castTotal, keyCrew, crewTotal, stats] =
    await Promise.all([
      listMediaGenres(item.id),
      listMediaCompanies(item.id),
      listMediaTitles(item.id),
      listCast(item.id, item.mediaType, CAST_PREVIEW),
      countCast(item.id),
      listKeyCrew(item.id),
      countCrew(item.id),
      getMediaStats(item.id),
    ]);

  let libraryEntry: LibraryEntryRecord | null = null;
  let isFavorited = false;
  let ratingSystem: RatingSystem = "score100";

  if (user) {
    const [entry, favRows, settings] = await Promise.all([
      findEntry(user.id, item.id),
      db
        .select()
        .from(favoriteMedia)
        .where(and(eq(favoriteMedia.userId, user.id), eq(favoriteMedia.mediaId, item.id)))
        .limit(1),
      getUserSettings(user.id),
    ]);
    if (!entry.ok) throw new Error("failed to load library entry", { cause: entry.error });
    libraryEntry = entry.value;
    isFavorited = favRows.length > 0;
    ratingSystem = settings.ratingSystem;
  }

  return {
    media: item,
    genres,
    companies,
    altTitles,
    cast,
    castTotal,
    keyCrew,
    crewTotal,
    stats,
    libraryEntry,
    isFavorited,
    user: user ?? null,
    ratingSystem,
  };
});
