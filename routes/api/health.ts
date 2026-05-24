import { defineHandler } from "void";

export const GET = defineHandler((c) => {
  return {
    ok: true,
    now: new Date().toISOString(),
    role: c.get("role"),
  };
});
