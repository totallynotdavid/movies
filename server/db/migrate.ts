import type { SqlDatabase } from "./client";
import { migrateAggregationSchema } from "./schema/modules/aggregation";
import { migrateAuthSchema } from "./schema/modules/auth";
import { migrateCacheSchema } from "./schema/modules/cache";
import { migrateListsSchema } from "./schema/modules/lists";
import { migrateMediaSchema } from "./schema/modules/media";
import { migrateRecommendationsSchema } from "./schema/modules/recommendations";
import { migrateTrackingSchema } from "./schema/modules/tracking";

export async function migrateDb(db: SqlDatabase): Promise<void> {
  await migrateAuthSchema(db);
  await migrateMediaSchema(db);
  await migrateTrackingSchema(db);
  await migrateListsSchema(db);
  await migrateRecommendationsSchema(db);
  await migrateAggregationSchema(db);
  await migrateCacheSchema(db);
}
