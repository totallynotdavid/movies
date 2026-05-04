import type { SqlDatabase } from "../db/client.ts";
import { assertAllowedFetchUrl } from "./cached-fetch-config.ts";

interface CacheEnvelope<T> {
  value: T;
  fetchedAt: string;
  staleAt: string;
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const ttlMs = 1000 * 60 * 60;

export async function cachedJsonFetch<T>(
  db: SqlDatabase,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const parsed = new URL(url);
  assertAllowedFetchUrl(parsed);
  const key = `fetch:${parsed.toString()}`;
  const cached = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  const now = Date.now();

  if (cached && Date.parse(cached.staleAt) > now) {
    return cached.value;
  }

  const response = await fetch(parsed, init);
  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `tmdb_upstream_error:${response.status}`,
    });
  }

  const value = (await response.json()) as T;
  const envelope = {
    value,
    fetchedAt: new Date(now).toISOString(),
    staleAt: new Date(now + ttlMs).toISOString(),
  };
  memoryCache.set(key, envelope);

  await db
    .insertInto("external_fetch_cache")
    .values({
      key,
      url: parsed.toString(),
      body: JSON.stringify(value),
      fetched_at: envelope.fetchedAt,
      stale_at: envelope.staleAt,
    })
    .onConflict((oc) =>
      oc.column("key").doUpdateSet({
        body: JSON.stringify(value),
        fetched_at: envelope.fetchedAt,
        stale_at: envelope.staleAt,
      }),
    )
    .execute();

  return value;
}
