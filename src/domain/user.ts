import { db } from "void/db";
import { and, eq } from "drizzle-orm";
import { userTable } from "@/db/auth-schema";
import { parseRatingSystem, type RatingSystem } from "./rating";
import { isAvatarColor, type AvatarColor, type Visibility } from "@/shared/types/identity";

export type UserRole = "anonymous" | "member" | "admin";

// Read-only domain access to Better Auth's `user` table.
// User-settable writes go through auth client mutations.

function toVisibility(value: string | null): Visibility {
  return value === "public" ? "public" : "private";
}

function toAvatarColor(value: string | null): AvatarColor | null {
  return isAvatarColor(value) ? value : null;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const rows = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return rows[0]?.role === "admin" ? "admin" : "member";
}

// Lean identity read for request middleware and shared client context.
// Includes role for auth gating, plus username and visibility for public-profile nav.
export type UserContext = {
  role: UserRole;
  username: string | null;
  visibility: Visibility;
};

export async function getUserContext(userId: string): Promise<UserContext> {
  const rows = await db
    .select({
      role: userTable.role,
      username: userTable.username,
      visibility: userTable.visibility,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  const row = rows[0];
  return {
    role: row?.role === "admin" ? "admin" : "member",
    username: row?.username ?? null,
    visibility: toVisibility(row?.visibility ?? null),
  };
}

export async function getUserSettings(userId: string) {
  const rows = await db
    .select({ ratingSystem: userTable.ratingSystem, timeZone: userTable.timeZone })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return {
    ratingSystem: parseRatingSystem(rows[0]?.ratingSystem),
    timeZone: rows[0]?.timeZone ?? null,
  };
}

export async function getUserTimeZone(userId: string): Promise<string | null> {
  const rows = await db
    .select({ timeZone: userTable.timeZone })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return rows[0]?.timeZone ?? null;
}

// Read model for settings UI.
export type UserProfile = {
  username: string | null;
  displayName: string;
  email: string;
  avatarEmoji: string | null;
  avatarColor: AvatarColor | null;
  visibility: Visibility;
  ratingSystem: RatingSystem;
  timeZone: string | null;
  joinedAt: number;
  role: UserRole;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const rows = await db
    .select({
      username: userTable.username,
      name: userTable.name,
      email: userTable.email,
      avatarEmoji: userTable.avatarEmoji,
      avatarColor: userTable.avatarColor,
      visibility: userTable.visibility,
      ratingSystem: userTable.ratingSystem,
      timeZone: userTable.timeZone,
      createdAt: userTable.createdAt,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    username: row.username ?? null,
    displayName: row.name,
    email: row.email,
    avatarEmoji: row.avatarEmoji ?? null,
    avatarColor: toAvatarColor(row.avatarColor),
    visibility: toVisibility(row.visibility),
    ratingSystem: parseRatingSystem(row.ratingSystem),
    timeZone: row.timeZone ?? null,
    joinedAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    role: row.role === "admin" ? "admin" : "member",
  };
}

// Public identity returned for /u/{username}; null means not found or not public.
// `timeZone` is included for owner-zone recap-year resolution.
export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string | null;
  avatarColor: AvatarColor | null;
  joinedAt: number;
  timeZone: string | null;
};

export async function findPublicProfile(username: string): Promise<PublicProfile | null> {
  const handle = username.toLowerCase();
  const rows = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      name: userTable.name,
      avatarEmoji: userTable.avatarEmoji,
      avatarColor: userTable.avatarColor,
      visibility: userTable.visibility,
      timeZone: userTable.timeZone,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(and(eq(userTable.username, handle), eq(userTable.visibility, "public")))
    .limit(1);

  const row = rows[0];
  if (!row || !row.username) return null;

  return {
    id: row.id,
    username: row.username,
    displayName: row.name,
    avatarEmoji: row.avatarEmoji ?? null,
    avatarColor: toAvatarColor(row.avatarColor),
    joinedAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    timeZone: row.timeZone ?? null,
  };
}
