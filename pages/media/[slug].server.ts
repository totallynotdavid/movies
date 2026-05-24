import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { libraryEntries, media, userFavoriteMedia } from "../../db/schema";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const user = getUser();

  const rows = await db.select().from(media).where(eq(media.slug, slug)).limit(1);
  const item = rows[0];

  if (!item) {
    return c.notFound();
  }

  let libraryEntry: {
    id: string;
    status: "planned" | "watching" | "completed" | "paused" | "dropped";
    score100: number | null;
    progressCurrent: number;
    progressTotal: number | null;
    notes: string | null;
  } | null = null;

  let isFavorited = false;

  if (user) {
    const [entryRows, favRows] = await Promise.all([
      db
        .select({
          id: libraryEntries.id,
          status: libraryEntries.status,
          score100: libraryEntries.score100,
          progressCurrent: libraryEntries.progressCurrent,
          progressTotal: libraryEntries.progressTotal,
          notes: libraryEntries.notes,
        })
        .from(libraryEntries)
        .where(and(eq(libraryEntries.userId, user.id), eq(libraryEntries.mediaId, item.id)))
        .limit(1),
      db
        .select()
        .from(userFavoriteMedia)
        .where(and(eq(userFavoriteMedia.userId, user.id), eq(userFavoriteMedia.mediaId, item.id)))
        .limit(1),
    ]);
    libraryEntry = entryRows[0] ?? null;
    isFavorited = favRows.length > 0;
  }

  return { media: item, libraryEntry, isFavorited, user: user ?? null };
});
