import {
  findMediaByTmdbIds,
  searchLocalMedia,
  type MediaType,
  upsertMediaFromTmdb,
} from "../domain/media";
import {
  fetchTmdbShowTotals,
  searchTmdbMedia,
  tmdbToken,
  type TmdbMediaResult,
} from "../integrations/tmdb";

export type MediaSearchResult = TmdbMediaResult & {
  cachedMediaId: string | null;
};

export async function searchCatalog(input: { query: string; limit?: number }) {
  const local = await searchLocalMedia(input.query, input.limit ?? 20);

  if (!tmdbToken()) {
    return {
      remoteEnabled: false,
      local,
      remote: [] as MediaSearchResult[],
    };
  }

  const remote = await searchTmdbMedia({ query: input.query, limit: input.limit ?? 20 });
  const cachedRows = await findMediaByTmdbIds(
    remote.map((item) => ({ mediaType: item.mediaType, tmdbId: item.tmdbId })),
  );
  const cachedMap = new Map(cachedRows.map((row) => [`${row.mediaType}:${row.tmdbId}`, row.id]));

  return {
    remoteEnabled: true,
    local,
    remote: remote.map((item) => {
      const cacheKey = `${item.mediaType}:${item.tmdbId}`;
      return {
        ...item,
        cachedMediaId: cachedMap.get(cacheKey) ?? null,
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
  if (typeof body.tmdbId !== "number" || !Number.isInteger(body.tmdbId) || body.tmdbId <= 0) {
    throw new Error("tmdbId must be a positive integer");
  }
  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new Error("title is required");
  }
  if (typeof body.slug !== "string" || body.slug.trim() === "") {
    throw new Error("slug is required");
  }

  return {
    mediaType: body.mediaType as MediaType,
    tmdbId: body.tmdbId,
    title: body.title.trim(),
    slug: body.slug.trim(),
    originalTitle: typeof body.originalTitle === "string" ? body.originalTitle : null,
    overview: typeof body.overview === "string" ? body.overview : null,
    posterPath: typeof body.posterPath === "string" ? body.posterPath : null,
    backdropPath: typeof body.backdropPath === "string" ? body.backdropPath : null,
    releaseDate: typeof body.releaseDate === "string" ? body.releaseDate : null,
    seasonCount: typeof body.seasonCount === "number" ? body.seasonCount : null,
    episodeCount: typeof body.episodeCount === "number" ? body.episodeCount : null,
    voteAverage: typeof body.voteAverage === "number" ? body.voteAverage : null,
    voteCount: typeof body.voteCount === "number" ? body.voteCount : null,
    popularity: typeof body.popularity === "number" ? body.popularity : null,
  };
}

export async function cacheMediaSelection(input: unknown) {
  const validInput = validateCacheInput(input);
  const showTotals =
    validInput.mediaType === "show" && tmdbToken()
      ? await fetchTmdbShowTotals({ tmdbId: validInput.tmdbId })
      : { seasonCount: validInput.seasonCount, episodeCount: validInput.episodeCount };

  const mediaId = await upsertMediaFromTmdb({
    ...validInput,
    ...showTotals,
  });
  return { mediaId };
}
