// Shared identity vocabulary for the domain reads, the settings UI, and the
// public profile: visibility states, avatar palette, and the username rules used
// for inline UI validation. auth.ts deliberately keeps its own copy of the
// username rules (its codegen loader cannot import app modules); keep them in sync.

export type Visibility = "public" | "private";

export type AvatarColor = "sky" | "coral" | "amber" | "emerald" | "violet" | "magenta" | "neutral";

export const AVATAR_COLORS: readonly AvatarColor[] = [
  "sky",
  "coral",
  "amber",
  "emerald",
  "violet",
  "magenta",
  "neutral",
] as const;

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === "string" && (AVATAR_COLORS as readonly string[]).includes(value);
}

// Handles live under /u/{username}, so they never collide with app routes; these
// rules are about a clean, linkable, lowercase identifier, not route safety.
export const USERNAME_RULES = {
  min: 3,
  max: 20,
  // lowercase letters, digits, underscore. Normalization (lowercasing) is done by
  // the Better Auth username plugin; this is the post-normalization shape.
  pattern: /^[a-z0-9_]+$/,
} as const;

// Reserved only to stop impersonation of the platform, not for routing. Compared
// against the normalized (lowercased) username.
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "support",
  "official",
  "staff",
  "root",
]);

export function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_RULES.min &&
    username.length <= USERNAME_RULES.max &&
    USERNAME_RULES.pattern.test(username) &&
    !RESERVED_USERNAMES.has(username)
  );
}
