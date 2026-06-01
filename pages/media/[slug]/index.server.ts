import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { findMediaBySlug } from "@/domain/catalog/media";
import { isMediaFavorited } from "@/domain/tracking/favorites";
import { findEntry, type LibraryEntryRecord } from "@/domain/tracking/library";
import { getShowProgress, listWatchedEpisodes } from "@/domain/tracking/watch-state";
import { listEpisodesBySeason, type SeasonEpisodes } from "@/domain/catalog/episodes";
import { getUserSettings } from "@/domain/user";
import { ensureMediaDetails } from "@/services/media-hydration";
import { countCast, countCrew, listCast, listKeyCrew } from "@/domain/catalog/credits";
import { listMediaCompanies, listMediaGenres, listMediaTitles } from "@/domain/catalog/metadata";
import { getMediaStats } from "@/domain/insights/title-stats";
import type { RatingSystem } from "@/domain/rating";

const CAST_PREVIEW = 12;

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const user = getUser();

  const found = await findMediaBySlug(slug);

  if (!found) {
    return c.notFound();
  }

  // State-keyed hydration: block only when the entity is a bare stub; serve
  // stale/failed data immediately and refresh off-request. The service owns the
  // failure model, so the loader never swallows or re-reads by hand.
  const item = await ensureMediaDetails(found);

  const [genres, companies, altTitles, cast, castTotal, keyCrew, crewTotal, stats] =
    await Promise.all([
      listMediaGenres(item.id),
      listMediaCompanies(item.id),
      listMediaTitles(item.id),
      listCast(item.id, item.mediaType, CAST_PREVIEW),
      countCast(item.id),
      listKeyCrew(item.id),
      countCrew(item.id),
      getMediaStats(item.id),
    ]);

  // Episode picker data is public (seasons); watched marks are per-user.
  const seasons: SeasonEpisodes[] =
    item.mediaType === "show" ? await listEpisodesBySeason(item.id) : [];

  let libraryEntry: LibraryEntryRecord | null = null;
  let watchedEpisodeCount = 0;
  let watchedEpisodeKeys: string[] = [];
  let isFavorited = false;
  let ratingSystem: RatingSystem = "score100";

  if (user) {
    const [entry, favorited, settings, progress, watched] = await Promise.all([
      findEntry(user.id, item.id),
      isMediaFavorited(user.id, item.id),
      getUserSettings(user.id),
      item.mediaType === "show" ? getShowProgress(user.id, item.id) : null,
      item.mediaType === "show" ? listWatchedEpisodes(user.id, item.id) : [],
    ]);
    if (!entry.ok) throw new Error("failed to load library entry", { cause: entry.error });
    libraryEntry = entry.value;
    watchedEpisodeCount = progress?.watchedEpisodeCount ?? 0;
    watchedEpisodeKeys = watched.map((e) => `${e.seasonNumber}:${e.episodeNumber}`);
    isFavorited = favorited;
    ratingSystem = settings.ratingSystem;
  }

  return {
    media: item,
    genres,
    companies,
    altTitles,
    cast,
    castTotal,
    keyCrew,
    crewTotal,
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
