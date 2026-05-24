import { defineEnv, string } from "void/env";

export default defineEnv({
  TMDB_READ_ACCESS_TOKEN: string().optional(),
  BETTER_AUTH_SECRET: string(),
});
