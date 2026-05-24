import { defineHandler } from "void";
import { requireAuth } from "void/auth";
import {
  addFavoriteActor,
  addFavoriteMedia,
  listFavoriteActors,
  listFavoriteMedia,
  removeFavoriteActor,
  removeFavoriteMedia,
} from "../../../src/domain/favorites";

export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  const [media, actors] = await Promise.all([
    listFavoriteMedia(user.id),
    listFavoriteActors(user.id),
  ]);
  return c.json({ media, actors });
});

export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = (await c.req.json()) as {
    type: "media" | "actor";
    mediaId?: string;
    actorTmdbId?: number;
    actorName?: string;
    actorProfilePath?: string | null;
  };

  if (body.type === "media") {
    if (!body.mediaId) return c.json({ error: "mediaId required" }, 400);
    await addFavoriteMedia(user.id, body.mediaId);
    return c.json({ ok: true });
  }

  if (body.type === "actor") {
    if (!body.actorTmdbId || !body.actorName) {
      return c.json({ error: "actorTmdbId and actorName required" }, 400);
    }
    await addFavoriteActor(user.id, {
      actorTmdbId: body.actorTmdbId,
      actorName: body.actorName,
      actorProfilePath: body.actorProfilePath,
    });
    return c.json({ ok: true });
  }

  return c.json({ error: "invalid type" }, 400);
});

export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = (await c.req.json()) as {
    type: "media" | "actor";
    mediaId?: string;
    actorTmdbId?: number;
  };

  if (body.type === "media") {
    if (!body.mediaId) return c.json({ error: "mediaId required" }, 400);
    await removeFavoriteMedia(user.id, body.mediaId);
    return c.json({ ok: true });
  }

  if (body.type === "actor") {
    if (!body.actorTmdbId) return c.json({ error: "actorTmdbId required" }, 400);
    await removeFavoriteActor(user.id, body.actorTmdbId);
    return c.json({ ok: true });
  }

  return c.json({ error: "invalid type" }, 400);
});
