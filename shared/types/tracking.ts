export const TRACKING_STATUSES = [
  "planned",
  "watching",
  "completed",
  "paused",
  "dropped",
  "rewatching",
] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];
export type MediaType = "movie" | "show";

export interface LibraryEntry {
  id: string;
  userId: string;
  entityId: string;
  mediaType: MediaType;
  title: string;
  status: TrackingStatus;
  score100: number | null;
  progressCurrent: number;
  progressTotal: number | null;
  startedOn: string | null;
  finishedOn: string | null;
  rewatchCount: number;
  notes: string | null;
  updatedAt: string;
}
