import * as v from "valibot";
import { TRACKING_STATUSES } from "../types/tracking";

export const StatusSchema = v.picklist(TRACKING_STATUSES);

export const MarkMovieWatchedSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  score100: v.optional(v.nullable(v.number())),
  watchedOn: v.optional(v.string()),
});

export const AdvanceShowSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  expectedNextEpisode: v.optional(v.number()),
  totalEpisodes: v.optional(v.nullable(v.number())),
});
