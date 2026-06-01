import { defineSeed } from "void/seed";
import type * as schemaModule from "./schema";
import type { MediaFixture } from "./fixtures/types";
import mediaJson from "./fixtures/media.json" with { type: "json" };

type Schema = typeof schemaModule;

export default defineSeed<Schema>(async ({ db, schema }) => {
  const now = Date.now();
  const media = mediaJson as MediaFixture[];

  await db
    .insert(schema.media)
    .values(
      media.map((item) => ({
        ...item,
        mediaType: item.mediaType as "movie" | "show",
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();

  console.log(`Seeded ${media.length} media items.`);
});
