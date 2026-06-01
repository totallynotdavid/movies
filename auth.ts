// Auth config for Better Auth + app-specific additional user fields.
// Keep this file self-contained. The auth-config codegen loader is plain Node ESM
// and does not resolve app-local extensionless TS imports.

import { defineAuth } from "void/auth";
import { username } from "better-auth/plugins";
import { env } from "void/env";

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const RESERVED_USERNAMES = new Set(["admin", "support", "official", "staff", "root"]);

// Authoritative username validator for auth writes.
// shared/types/identity.ts mirrors these rules for UI-only validation.
function isValidUsername(value: string): boolean {
  return (
    value.length >= USERNAME_MIN &&
    value.length <= USERNAME_MAX &&
    USERNAME_PATTERN.test(value) &&
    !RESERVED_USERNAMES.has(value)
  );
}

// `role` is not user-settable through auth.updateUser.
// Role assignment happens in the create hook below.
export default defineAuth(({ defaults }) => ({
  ...defaults,
  plugins: [
    ...(defaults.plugins ?? []),
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: (value) => isValidUsername(value),
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: ["member", "admin"],
        required: false,
        defaultValue: "member",
        input: false,
      },
      ratingSystem: { type: "string", required: false, defaultValue: "score100", input: true },
      timeZone: { type: "string", required: false, input: true },
      visibility: { type: "string", required: false, defaultValue: "private", input: true },
      avatarEmoji: { type: "string", required: false, input: true },
      avatarColor: { type: "string", required: false, input: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role = env.ADMIN_EMAIL && user.email === env.ADMIN_EMAIL ? "admin" : "member";
          return { data: { ...user, role } };
        },
      },
    },
  },
}));
