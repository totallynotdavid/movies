import { kv } from "void/kv";
import { assertAllowedFetchUrl } from "./cached-fetch-config";

const ttlSeconds = 60 * 60;

export async function cachedJsonFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const parsed = new URL(url);
  assertAllowedFetchUrl(parsed);
  const key = `fetch:${parsed.toString()}`;

  const cached = await kv.get<T>(key);
  if (cached !== null) return cached;

  const response = await fetch(parsed, init);
  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `tmdb_upstream_error:${response.status}`,
    });
  }

  const value: T = await response.json();
  await kv.put(key, value, { ttl: ttlSeconds });
  return value;
}
