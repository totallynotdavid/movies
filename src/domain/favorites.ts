import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia, favoritePeople } from "../../db/schema";

export async function listFavoriteMedia(userId: string) {
  return db.select().from(favoriteMedia).where(eq(favoriteMedia.userId, userId));
}

export async function addFavoriteMedia(userId: string, mediaId: string) {
  const id = `${userId}:fav:${mediaId}`;
  await db
    .insert(favoriteMedia)
    .values({ id, userId, mediaId, createdAt: Date.now() })
    .onConflictDoNothing();
  return { ok: true };
}

export async function removeFavoriteMedia(userId: string, mediaId: string) {
  await db
    .delete(favoriteMedia)
    .where(and(eq(favoriteMedia.userId, userId), eq(favoriteMedia.mediaId, mediaId)));
  return { ok: true };
}

export async function listFavoritePeople(userId: string) {
  return db.select().from(favoritePeople).where(eq(favoritePeople.userId, userId));
}

export async function addFavoritePerson(userId: string, personId: string) {
  const id = `${userId}:fav:${personId}`;
  await db
    .insert(favoritePeople)
    .values({ id, userId, personId, createdAt: Date.now() })
    .onConflictDoNothing();
  return { ok: true };
}

export async function removeFavoritePerson(userId: string, personId: string) {
  await db
    .delete(favoritePeople)
    .where(and(eq(favoritePeople.userId, userId), eq(favoritePeople.personId, personId)));
  return { ok: true };
}
