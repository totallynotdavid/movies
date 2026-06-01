import { findMedia } from "@/domain/catalog/media";
import type { TrackingError } from "@/domain/errors";
import type { Result } from "@/result";
import {
  findEntry,
  upsertLibraryEntry,
  type LibraryEntryRecord,
  type LibraryStatus,
} from "./library";
import { logMovieWatch } from "./watch-log";

type SaveLibraryEntryInput = {
  userId: string;
  mediaId: string;
  status: LibraryStatus;
  score100?: number | null;
  notes?: string | null;
};

export function shouldLogMovieCompletion(
  mediaType: "movie" | "show",
  previousStatus: LibraryStatus | null,
  nextStatus: LibraryStatus,
): boolean {
  return mediaType === "movie" && previousStatus !== "completed" && nextStatus === "completed";
}

export async function saveLibraryEntry(
  input: SaveLibraryEntryInput,
): Promise<Result<LibraryEntryRecord, TrackingError>> {
  const [media, existing] = await Promise.all([
    findMedia(input.mediaId),
    findEntry(input.userId, input.mediaId),
  ]);
  if (!media.ok) return media;
  if (!existing.ok) return existing;

  if (
    shouldLogMovieCompletion(media.value.mediaType, existing.value?.status ?? null, input.status)
  ) {
    return logMovieWatch({
      userId: input.userId,
      mediaId: input.mediaId,
      score100: input.score100,
      notes: input.notes,
    });
  }

  return upsertLibraryEntry(input);
}
