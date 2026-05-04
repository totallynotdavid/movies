import { getDb } from "../db/client.ts";
import { hashToken } from "./sessions.ts";
import { requireAuth } from "./require-auth.ts";

function isUnsafe(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export async function validateCsrf(event: any): Promise<void> {
  if (!isUnsafe(event.method || "GET")) return;

  const origin = getHeader(event, "origin");
  const host = getHeader(event, "host");
  if (origin && host && new URL(origin).host !== host) {
    throw createError({ statusCode: 403, statusMessage: "origin_not_allowed" });
  }

  const secFetchSite = getHeader(event, "sec-fetch-site");
  if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) {
    throw createError({ statusCode: 403, statusMessage: "fetch_metadata_not_allowed" });
  }

  const db = await getDb(event);
  const auth = await requireAuth(event, db);
  const token = getHeader(event, "x-csrf-token");
  if (!token || hashToken(token) !== auth.csrfTokenHash) {
    throw createError({ statusCode: 403, statusMessage: "csrf_token_invalid" });
  }
}
