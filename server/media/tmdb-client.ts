import { cachedJsonFetch } from "../cache/cached-fetch";
import { mapTmdbDetails, mapTmdbSearchResult } from "./tmdb-mapper";

function getToken(): string {
  const token = useRuntimeConfig().tmdb.readAccessToken;
  if (!token) {
    throw createError({ statusCode: 500, statusMessage: "tmdb_token_not_configured" });
  }
  return token;
}

function tmdbUrl(path: string, query: Record<string, string | number | undefined>) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function searchTmdb(input: { q: string; type?: "movie" | "show" }) {
  const types = input.type ? [input.type] : (["movie", "show"] as const);
  const results = [];

  for (const type of types) {
    const tmdbType = type === "show" ? "tv" : "movie";
    const data = await cachedJsonFetch<{ results?: any[] }>(
      tmdbUrl(`/search/${tmdbType}`, {
        query: input.q,
        include_adult: "false",
        language: "en-US",
        page: 1,
      }),
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    results.push(
      ...(data.results || []).map((result) => mapTmdbSearchResult(result, type)).filter(Boolean),
    );
  }

  return results;
}

export async function getTmdbDetails(type: "movie" | "show", tmdbId: number) {
  const tmdbType = type === "show" ? "tv" : "movie";
  const data = await cachedJsonFetch<any>(
    tmdbUrl(`/${tmdbType}/${tmdbId}`, { language: "en-US" }),
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  return mapTmdbDetails(data, type);
}
