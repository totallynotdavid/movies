import { env } from "void/env";

const TMDB_BASE = "https://api.themoviedb.org/3";

export function tmdbToken(): string | null {
  const token = env.TMDB_READ_ACCESS_TOKEN;
  return typeof token === "string" && token.trim() !== "" ? token : null;
}

export async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = tmdbToken();
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is not configured");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`TMDB ${path} → ${response.status}`);
  return response.json() as Promise<T>;
}
