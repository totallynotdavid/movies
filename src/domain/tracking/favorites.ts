import { and, eq } from "drizzle-orm";
import { db } from "void/db";
import { favoriteMedia, favoritePeople, media, people } from "@schema";
import type { MediaRecord } from "@/domain/catalog/media";

export async function listFavoriteMedia(userId: string) {
  return db.select().from(favoriteMedia).where(eq(favoriteMedia.userId, userId));
}

// Favorites joined to their catalog rows, for the profile + media pages — so a
// loader never hand-rolls the favorite⋈media join.
export async function favoriteMediaForUser(
  userId: string,
): Promise<{ mediaId: string; media: MediaRecord }[]> {
  return db
    .select({ mediaId: favoriteMedia.mediaId, media })
    .from(favoriteMedia)
    .innerJoin(media, eq(favoriteMedia.mediaId, media.id))
    .where(eq(favoriteMedia.userId, userId));
}

export async function favoritePeopleForUser(userId: string) {
  return db
    .select({
      personId: people.id,
      name: people.name,
      slug: people.slug,
      profilePath: people.profilePath,
    })
    .from(favoritePeople)
    .innerJoin(people, eq(favoritePeople.personId, people.id))
    .where(eq(favoritePeople.userId, userId));
}

export async function isMediaFavorited(userId: string, mediaId: string): Promise<boolean> {
  const rows = await db
    .select({ id: favoriteMedia.id })
    .from(favoriteMedia)
    .where(and(eq(favoriteMedia.userId, userId), eq(favoriteMedia.mediaId, mediaId)))
    .limit(1);
  return rows.length > 0;
}

export async function isPersonFavorited(userId: string, personId: string): Promise<boolean> {
  const rows = await db
    .select({ id: favoritePeople.id })
    .from(favoritePeople)
    .where(and(eq(favoritePeople.userId, userId), eq(favoritePeople.personId, personId)))
    .limit(1);
  return rows.length > 0;
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
