CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user"("email");

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_session_user" ON "session"("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" INTEGER,
  "refreshTokenExpiresAt" INTEGER,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_account_user" ON "account"("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER,
  "updatedAt" INTEGER
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users"("email");

CREATE TABLE IF NOT EXISTS "media" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "media_type" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'tmdb',
  "provider_id" INTEGER NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "original_title" TEXT,
  "overview" TEXT,
  "poster_path" TEXT,
  "backdrop_path" TEXT,
  "release_date" TEXT,
  "vote_average" REAL,
  "vote_count" INTEGER,
  "popularity" REAL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "media_slug_unique" ON "media"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_media_provider_provider_id" ON "media"("provider", "provider_id");
CREATE INDEX IF NOT EXISTS "idx_media_type_popularity" ON "media"("media_type", "popularity");
CREATE INDEX IF NOT EXISTS "idx_media_title" ON "media"("title");

CREATE TABLE IF NOT EXISTS "library_entries" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "score100" INTEGER,
  "progress_current" INTEGER NOT NULL DEFAULT 0,
  "progress_total" INTEGER,
  "notes" TEXT,
  "updated_at" INTEGER NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_library_user_media" ON "library_entries"("user_id", "media_id");
CREATE INDEX IF NOT EXISTS "idx_library_user_updated" ON "library_entries"("user_id", "updated_at");
