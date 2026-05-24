import { defineHandler } from "void";
import type { InferProps } from "void";
import { requireAuth } from "void/auth";
import { eq } from "drizzle-orm";
import { db } from "void/db";
import { libraryEntries, media, userFavoriteActors, userFavoriteMedia } from "../db/schema";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = requireAuth(c);

  const [library, favoriteMedia, favoriteActors] = await Promise.all([
    db
      .select({ id: libraryEntries.id, status: libraryEntries.status, media })
      .from(libraryEntries)
      .innerJoin(media, eq(libraryEntries.mediaId, media.id))
      .where(eq(libraryEntries.userId, user.id)),
    db
      .select({ mediaId: userFavoriteMedia.mediaId, media })
      .from(userFavoriteMedia)
      .innerJoin(media, eq(userFavoriteMedia.mediaId, media.id))
      .where(eq(userFavoriteMedia.userId, user.id)),
    db.select().from(userFavoriteActors).where(eq(userFavoriteActors.userId, user.id)),
  ]);

  const stats = {
    total: library.length,
    watching: library.filter((e) => e.status === "watching").length,
    completed: library.filter((e) => e.status === "completed").length,
    planned: library.filter((e) => e.status === "planned").length,
  };

  return { user, library, favoriteMedia, favoriteActors, stats };
});
