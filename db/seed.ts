import { defineSeed } from "void/seed";
import type * as schemaModule from "./schema";
import { seededMedia } from "./fixtures/media";

type Schema = typeof schemaModule;

export default defineSeed<Schema>(async ({ db, schema }) => {
  const now = Date.now();

  await db
    .insert(schema.users)
    .values({
      id: "bootstrap-admin",
      email: "admin@example.com",
      name: "Bootstrap Admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.media)
    .values(
      seededMedia.map((item) => ({
        ...item,
        provider: "tmdb",
        posterPath: null,
        backdropPath: null,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();

  console.log(`Seeded ${seededMedia.length} media rows.`);
});
