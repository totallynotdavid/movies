import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { isMediaFavorited } from "@/domain/tracking/favorites";
import { findEntry, type LibraryEntryRecord } from "@/domain/tracking/library-entries";
import { buildShowView } from "@/domain/tracking/show-view";
import type { SeasonEpisodes } from "@/domain/catalog/episodes";
import { getUserSettings } from "@/domain/user";
import { loadMedia } from "@/services/media-hydration";
import { listMediaCompanies, listMediaGenres, listMediaTitles } from "@/domain/catalog/metadata";
import { getMediaStats } from "@/domain/insights/title-stats";
import type { RatingSystem } from "@/domain/rating";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const user = getUser();

  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  const [genres, companies, altTitles, stats] = await Promise.all([
    listMediaGenres(item.id),
    listMediaCompanies(item.id),
    listMediaTitles(item.id),
    getMediaStats(item.id),
  ]);

  // Episode picker data is public; watched marks are per-user.
  const showView = item.mediaType === "show" ? await buildShowView(user?.id ?? null, item) : null;
  const seasons: SeasonEpisodes[] = showView?.seasons ?? [];
  const watchedEpisodeCount = showView?.progress.watchedEpisodeCount ?? 0;
  const watchedEpisodeKeys = showView?.watchedKeys ?? [];

  let libraryEntry: LibraryEntryRecord | null = null;
  let isFavorited = false;
  let ratingSystem: RatingSystem = "score100";

  if (user) {
    const [entry, favorited, settings] = await Promise.all([
      findEntry(user.id, item.id),
      isMediaFavorited(user.id, item.id),
      getUserSettings(user.id),
    ]);
    if (!entry.ok) throw new Error("failed to load library entry", { cause: entry.error });
    libraryEntry = entry.value;
    isFavorited = favorited;
    ratingSystem = settings.ratingSystem;
  }

  return {
    media: item,
    genres,
    companies,
    altTitles,
    stats,
    seasons,
    libraryEntry,
    watchedEpisodeCount,
    watchedEpisodeKeys,
    isFavorited,
    user: user ?? null,
    ratingSystem,
  };
});
