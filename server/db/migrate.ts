import type { SqlDatabase } from "./client.ts";
import { migrateAggregationSchema } from "./schema/modules/aggregation.ts";
import { migrateAuthSchema } from "./schema/modules/auth.ts";
import { migrateCacheSchema } from "./schema/modules/cache.ts";
import { migrateListsSchema } from "./schema/modules/lists.ts";
import { migrateMediaSchema } from "./schema/modules/media.ts";
import { migrateRecommendationsSchema } from "./schema/modules/recommendations.ts";
import { migrateTrackingSchema } from "./schema/modules/tracking.ts";

export async function migrateDb(db: SqlDatabase): Promise<void> {
  await migrateAuthSchema(db);
  await migrateMediaSchema(db);
  await migrateTrackingSchema(db);
  await migrateListsSchema(db);
  await migrateRecommendationsSchema(db);
  await migrateAggregationSchema(db);
  await migrateCacheSchema(db);
}
