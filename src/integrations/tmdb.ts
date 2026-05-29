import type { MediaType } from "../domain/media";

export type TmdbMediaResult = {
  mediaType: MediaType;
  providerId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  seasonCount: number | null;
  episodeCount: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  slug: string;
};

type TmdbMultiItem = {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
};

function toSlug(input: string, providerId: number) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${base || "item"}-${providerId}`;
}

function mapTmdbItem(item: TmdbMultiItem): TmdbMediaResult | null {
  if (item.media_type !== "movie" && item.media_type !== "tv") {
    return null;
  }

  const mediaType: MediaType = item.media_type === "tv" ? "show" : "movie";
  const title = item.title ?? item.name;
  if (!title) {
    return null;
  }

  return {
    mediaType,
    providerId: item.id,
    title,
    originalTitle: item.original_title ?? item.original_name ?? null,
    overview: item.overview ?? null,
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    releaseDate: item.release_date ?? item.first_air_date ?? null,
    seasonCount: null,
    episodeCount: null,
    voteAverage: item.vote_average ?? null,
    voteCount: item.vote_count ?? null,
    popularity: item.popularity ?? null,
    slug: toSlug(title, item.id),
  };
}

export async function searchTmdbMedia(input: { token: string; query: string; limit?: number }) {
  const query = input.query.trim();
  if (!query) return [];

  const pageSize = Math.min(Math.max(input.limit ?? 20, 1), 20);
  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB search failed (${response.status})`);
  }

  const payload = (await response.json()) as { results?: TmdbMultiItem[] };
  return (payload.results ?? [])
    .map(mapTmdbItem)
    .filter((item) => item !== null)
    .slice(0, pageSize);
}

export async function fetchTmdbShowTotals(input: { token: string; providerId: number }) {
  const url = new URL(`https://api.themoviedb.org/3/tv/${input.providerId}`);
  url.searchParams.set("language", "en-US");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB show detail failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    number_of_episodes?: number;
    number_of_seasons?: number;
  };

  return {
    seasonCount: typeof payload.number_of_seasons === "number" ? payload.number_of_seasons : null,
    episodeCount:
      typeof payload.number_of_episodes === "number" ? payload.number_of_episodes : null,
  };
}
