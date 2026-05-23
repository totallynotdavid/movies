import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "void/db";
import { requestSessions, userSessions, users } from "../db/schema";
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

function mapUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    isAdmin: row.isAdmin,
    isExcludedFromAggregation: row.isExcludedFromAggregation,
  };
}

export async function createSession(
  event: any,
  user: AuthUser,
): Promise<{ user: AuthUser; csrfToken: string }> {
  const sessionToken = createToken();
  const csrfToken = createToken();
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const sessionId = crypto.randomUUID();

  await db.insert(userSessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(sessionToken),
    csrfTokenHash: hashToken(csrfToken),
    expiresAt: expires.toISOString(),
    createdAt: now.toISOString(),
  });

  await db.insert(requestSessions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    sessionId,
    ipHash: null,
    userAgent: getHeader(event, "user-agent") || null,
    createdAt: now.toISOString(),
  });

  setAuthCookies(event, { sessionToken, csrfToken, expires });
  return { user, csrfToken };
}

export async function getSession(
  event: any,
): Promise<{ user: AuthUser; csrfTokenHash: string } | null> {
  const sessionToken = getCookie(event, SESSION_COOKIE);
  if (!sessionToken) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      isAdmin: users.isAdmin,
      isExcludedFromAggregation: users.isExcludedFromAggregation,
      csrfTokenHash: userSessions.csrfTokenHash,
    })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(
      and(
        eq(userSessions.tokenHash, hashToken(sessionToken)),
        gt(userSessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    user: {
      id: row.id,
      email: row.email,
      username: row.username,
      isAdmin: row.isAdmin,
      isExcludedFromAggregation: row.isExcludedFromAggregation,
    },
    csrfTokenHash: row.csrfTokenHash,
  };
}

export async function findUserByLogin(login: string): Promise<LoginUser | null> {
  const normalized = login.toLowerCase();
  const [row] = await db
    .select()
    .from(users)
    .where(
      or(sql`lower(${users.email}) = ${normalized}`, sql`lower(${users.username}) = ${normalized}`),
    )
    .limit(1);

  return row ? { user: mapUser(row), passwordHash: row.passwordHash } : null;
}

export function csrfCookie(event: any) {
  return getCookie(event, CSRF_COOKIE);
}
