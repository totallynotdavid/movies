import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { userFavoriteActors, userFavoriteMedia } from "../../db/schema";

export async function listFavoriteMedia(userId: string) {
  return db.select().from(userFavoriteMedia).where(eq(userFavoriteMedia.userId, userId));
}

export async function addFavoriteMedia(userId: string, mediaId: string) {
  const id = `${userId}:fav:${mediaId}`;
  await db
    .insert(userFavoriteMedia)
    .values({ id, userId, mediaId, createdAt: Date.now() })
    .onConflictDoNothing();
  return { ok: true };
}

export async function removeFavoriteMedia(userId: string, mediaId: string) {
  await db
    .delete(userFavoriteMedia)
    .where(and(eq(userFavoriteMedia.userId, userId), eq(userFavoriteMedia.mediaId, mediaId)));
  return { ok: true };
}

export async function listFavoriteActors(userId: string) {
  return db.select().from(userFavoriteActors).where(eq(userFavoriteActors.userId, userId));
}

export async function addFavoriteActor(
  userId: string,
  actor: { actorTmdbId: number; actorName: string; actorProfilePath?: string | null },
) {
  const id = `${userId}:actor:${actor.actorTmdbId}`;
  await db
    .insert(userFavoriteActors)
    .values({
      id,
      userId,
      actorTmdbId: actor.actorTmdbId,
      actorName: actor.actorName,
      actorProfilePath: actor.actorProfilePath ?? null,
      createdAt: Date.now(),
    })
    .onConflictDoNothing();
  return { ok: true };
}

export async function removeFavoriteActor(userId: string, actorTmdbId: number) {
  await db
    .delete(userFavoriteActors)
    .where(
      and(eq(userFavoriteActors.userId, userId), eq(userFavoriteActors.actorTmdbId, actorTmdbId)),
    );
  return { ok: true };
}
