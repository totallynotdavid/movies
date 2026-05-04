import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "kysely";
import type { SqlDatabase } from "../db/client";
import { CSRF_COOKIE, SESSION_COOKIE, setAuthCookies } from "./cookies";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isExcludedFromAggregation: boolean;
}

export interface LoginUser {
  user: AuthUser;
  passwordHash: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return `sha256:${sha256(password)}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const expected = await hashPassword(password);
  const a = Buffer.from(expected);
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashToken(value: string): string {
  return sha256(value);
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function mapUser(row: any): AuthUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    isExcludedFromAggregation: Boolean(row.is_excluded_from_aggregation),
  };
}

export async function createSession(
  db: SqlDatabase,
  event: any,
  user: AuthUser,
): Promise<{ user: AuthUser; csrfToken: string }> {
  const sessionToken = createToken();
  const csrfToken = createToken();
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const sessionId = crypto.randomUUID();

  await db
    .insertInto("user_sessions")
    .values({
      id: sessionId,
      user_id: user.id,
      token_hash: hashToken(sessionToken),
      csrf_token_hash: hashToken(csrfToken),
      expires_at: expires.toISOString(),
      created_at: now.toISOString(),
    })
    .execute();
  await db
    .insertInto("request_sessions")
    .values({
      id: crypto.randomUUID(),
      user_id: user.id,
      session_id: sessionId,
      ip_hash: null,
      user_agent: getHeader(event, "user-agent") || null,
      created_at: now.toISOString(),
    })
    .execute();

  setAuthCookies(event, { sessionToken, csrfToken, expires });
  return { user, csrfToken };
}

export async function getSession(
  db: SqlDatabase,
  event: any,
): Promise<{ user: AuthUser; csrfTokenHash: string } | null> {
  const sessionToken = getCookie(event, SESSION_COOKIE);
  if (!sessionToken) return null;

  const row = await db
    .selectFrom("user_sessions as s")
    .innerJoin("users as u", "u.id", "s.user_id")
    .selectAll("u")
    .select("s.csrf_token_hash")
    .where("s.token_hash", "=", hashToken(sessionToken))
    .where("s.expires_at", ">", new Date().toISOString())
    .executeTakeFirst();

  return row ? { user: mapUser(row), csrfTokenHash: row.csrf_token_hash } : null;
}

export async function findUserByLogin(db: SqlDatabase, login: string): Promise<LoginUser | null> {
  const normalized = login.toLowerCase();
  const byEmail = await db
    .selectFrom("users")
    .selectAll()
    .where(sql`lower(email)`, "=", normalized)
    .executeTakeFirst();
  if (byEmail) {
    return {
      user: mapUser(byEmail),
      passwordHash: byEmail.password_hash,
    };
  }

  const byUsername = await db
    .selectFrom("users")
    .selectAll()
    .where(sql`lower(username)`, "=", normalized)
    .executeTakeFirst();

  return byUsername
    ? {
        user: mapUser(byUsername),
        passwordHash: byUsername.password_hash,
      }
    : null;
}

export function csrfCookie(event: any) {
  return getCookie(event, CSRF_COOKIE);
}
