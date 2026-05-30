import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import {
  addFavoriteMedia,
  addFavoritePerson,
  listFavoriteMedia,
  listFavoritePeople,
  removeFavoriteMedia,
  removeFavoritePerson,
} from "../../../src/domain/favorites";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const [media, people] = await Promise.all([
    listFavoriteMedia(user.id),
    listFavoritePeople(user.id),
  ]);
  return c.json({ media, people });
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = (await c.req.json()) as {
    type: "media" | "person";
    mediaId?: string;
    personId?: string;
  };

  if (body.type === "media") {
    if (!body.mediaId) return c.json({ error: "mediaId required" }, 400);
    await addFavoriteMedia(user.id, body.mediaId);
    return c.json({ ok: true });
  }

  if (body.type === "person") {
    if (!body.personId) return c.json({ error: "personId required" }, 400);
    await addFavoritePerson(user.id, body.personId);
    return c.json({ ok: true });
  }

  return c.json({ error: "invalid type" }, 400);
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = (await c.req.json()) as {
    type: "media" | "person";
    mediaId?: string;
    personId?: string;
  };

  if (body.type === "media") {
    if (!body.mediaId) return c.json({ error: "mediaId required" }, 400);
    await removeFavoriteMedia(user.id, body.mediaId);
    return c.json({ ok: true });
  }

  if (body.type === "person") {
    if (!body.personId) return c.json({ error: "personId required" }, 400);
    await removeFavoritePerson(user.id, body.personId);
    return c.json({ ok: true });
  }

  return c.json({ error: "invalid type" }, 400);
});
