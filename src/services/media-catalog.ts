import { env } from "void/env";
import {
  findMediaByTmdbIds,
  searchLocalMedia,
  type MediaType,
  upsertMediaFromTmdb,
} from "../domain/media";
import { searchTmdbMedia, type TmdbMediaResult } from "../integrations/tmdb";

export type MediaSearchResult = TmdbMediaResult & {
  cached: boolean;
  cachedMediaId: string | null;
};

export async function searchCatalog(input: { query: string; limit?: number }) {
  const local = await searchLocalMedia(input.query, input.limit ?? 20);
  const token = env.TMDB_READ_ACCESS_TOKEN;

  if (typeof token !== "string" || token.trim() === "") {
    return {
      remoteEnabled: false,
      local,
      remote: [] as MediaSearchResult[],
    };
  }

  const remote = await searchTmdbMedia({ token, query: input.query, limit: input.limit ?? 20 });
  const cachedRows = await findMediaByTmdbIds(
    remote.map((item) => ({ mediaType: item.mediaType, providerId: item.providerId })),
  );
  const cachedMap = new Map(
    cachedRows.map((row) => [`${row.mediaType}:${row.providerId}`, row.id]),
  );

  return {
    remoteEnabled: true,
    local,
    remote: remote.map((item) => {
      const cacheKey = `${item.mediaType}:${item.providerId}`;
      const cachedMediaId = cachedMap.get(cacheKey) ?? null;
      return {
        ...item,
        cached: cachedMediaId !== null,
        cachedMediaId,
      };
    }),
  };
}

export function validateCacheInput(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid payload");
  }

  const body = input as Record<string, unknown>;

  if (body.mediaType !== "movie" && body.mediaType !== "show") {
    throw new Error("mediaType must be movie or show");
  }
  if (
    typeof body.providerId !== "number" ||
    !Number.isInteger(body.providerId) ||
    body.providerId <= 0
  ) {
    throw new Error("providerId must be a positive integer");
  }
  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new Error("title is required");
  }
  if (typeof body.slug !== "string" || body.slug.trim() === "") {
    throw new Error("slug is required");
  }

  return {
    mediaType: body.mediaType as MediaType,
    providerId: body.providerId,
    title: body.title.trim(),
    slug: body.slug.trim(),
    originalTitle: typeof body.originalTitle === "string" ? body.originalTitle : null,
    overview: typeof body.overview === "string" ? body.overview : null,
    posterPath: typeof body.posterPath === "string" ? body.posterPath : null,
    backdropPath: typeof body.backdropPath === "string" ? body.backdropPath : null,
    releaseDate: typeof body.releaseDate === "string" ? body.releaseDate : null,
    voteAverage: typeof body.voteAverage === "number" ? body.voteAverage : null,
    voteCount: typeof body.voteCount === "number" ? body.voteCount : null,
    popularity: typeof body.popularity === "number" ? body.popularity : null,
  };
}

export async function cacheMediaSelection(input: unknown) {
  const validInput = validateCacheInput(input);
  const mediaId = await upsertMediaFromTmdb(validInput);
  return { mediaId };
}
