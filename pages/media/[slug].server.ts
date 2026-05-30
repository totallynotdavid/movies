import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { userFavoriteMedia, media } from "../../db/schema";
import { findEntry, type LibraryEntryRecord } from "../../src/domain/library";
import { getUserSettings } from "../../src/domain/user";
import type { RatingSystem } from "../../src/domain/rating";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const user = getUser();

  const rows = await db.select().from(media).where(eq(media.slug, slug)).limit(1);
  const item = rows[0];

  if (!item) {
    return c.notFound();
  }

  let libraryEntry: LibraryEntryRecord | null = null;
  let isFavorited = false;
  let ratingSystem: RatingSystem = "score100";

  if (user) {
    const [entry, favRows, settings] = await Promise.all([
      findEntry(user.id, item.id),
      db
        .select()
        .from(userFavoriteMedia)
        .where(and(eq(userFavoriteMedia.userId, user.id), eq(userFavoriteMedia.mediaId, item.id)))
        .limit(1),
      getUserSettings(user.id),
    ]);
    if (!entry.ok) throw new Error("failed to load library entry", { cause: entry.error });
    libraryEntry = entry.value;
    isFavorited = favRows.length > 0;
    ratingSystem = settings.ratingSystem;
  }

  return { media: item, libraryEntry, isFavorited, user: user ?? null, ratingSystem };
});
