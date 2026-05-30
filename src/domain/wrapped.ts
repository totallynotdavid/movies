import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "void/db";
import {
  castCredits,
  crewCredits,
  episodes,
  genres,
  libraryEntries,
  media,
  mediaGenres,
  people,
  watchEvents,
} from "../../db/schema";
import { selectByIds } from "../db/kernel";
import type { MediaType } from "./media";

const ACTOR_LIMIT_PER_TITLE = 5;
const DIRECTOR_LIMIT_PER_TITLE = 2;
const CREW_LIMIT_PER_TITLE = 4;
const TOP_TITLE_LIMIT = 3;
const TOP_GENRE_LIMIT = 6;
const TOP_PERSON_LIMIT = 5;

const DIRECTOR_JOBS = ["Director", "Creator"] as const;
const CREW_JOBS = [
  "Writer",
  "Screenplay",
  "Story",
  "Original Music Composer",
  "Director of Photography",
  "Editor",
  "Executive Producer",
  "Producer",
] as const;

type WrappedWatchRow = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  posterPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  score100: number | null;
  watchedAt: number;
  watchedOn: string;
  episodeOrdinal: number | null;
};

type WrappedEpisodeRow = {
  mediaId: string;
  seasonNumber: number;
  episodeNumber: number;
  runtime: number | null;
};

type WrappedGenreRow = {
  mediaId: string;
  genreName: string;
};

type WrappedCastRow = {
  mediaId: string;
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  billingOrder: number | null;
  episodeCount: number | null;
};

type WrappedCrewRow = {
  mediaId: string;
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  job: string;
  episodeCount: number | null;
};

type WrappedCredit = {
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  subtitle: string | null;
};

type WrappedGenreAccumulator = {
  name: string;
  minutes: number;
  watchCount: number;
};

type WrappedTitleAccumulator = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  posterPath: string | null;
  releaseDate: string | null;
  minutes: number;
  watchCount: number;
  score100: number | null;
};

type WrappedPersonAccumulator = {
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  minutes: number;
  watchCount: number;
  mediaIds: Set<string>;
  subtitleCounts: Map<string, number>;
};

type WrappedFormatAccumulator = {
  mediaType: MediaType;
  label: string;
  minutes: number;
  watchCount: number;
};

type WrappedDayAccumulator = {
  date: string;
  minutes: number;
  watchCount: number;
};

type EpisodeRuntimeIndex = Map<
  string,
  {
    runtimes: Array<number | null>;
    averageRuntime: number;
  }
>;

export type WrappedTitleStat = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  slug: string;
  posterPath: string | null;
  releaseDate: string | null;
  minutes: number;
  watchCount: number;
  score100: number | null;
};

export type WrappedGenreStat = {
  name: string;
  minutes: number;
  watchCount: number;
  share: number;
};

export type WrappedPersonStat = {
  personId: string;
  name: string;
  slug: string;
  profilePath: string | null;
  minutes: number;
  watchCount: number;
  titleCount: number;
  subtitle: string | null;
};

export type WrappedFormatStat = {
  mediaType: MediaType;
  label: string;
  minutes: number;
  watchCount: number;
  share: number;
};

export type WrappedDayStat = {
  date: string;
  minutes: number;
  watchCount: number;
};

export type WrappedSummary = {
  year: number;
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalWatchCount: number;
  watchDays: number;
  longestStreak: number;
  busiestDay: WrappedDayStat | null;
  formatBreakdown: WrappedFormatStat[];
  topTitles: WrappedTitleStat[];
  topGenres: WrappedGenreStat[];
  topActors: WrappedPersonStat[];
  topDirectors: WrappedPersonStat[];
  topCrew: WrappedPersonStat[];
};

type WrappedBuildInput = {
  watchRows: WrappedWatchRow[];
  episodeRows: WrappedEpisodeRow[];
  genreRows: WrappedGenreRow[];
  castRows: WrappedCastRow[];
  crewRows: WrappedCrewRow[];
};

export function wrappedWindowStartDate(today = new Date()): string {
  return new Date(Date.UTC(today.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
}

function wrappedWindowEndDate(today = new Date()): string {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function emptyWrappedSummary(today = new Date()): WrappedSummary {
  return {
    year: today.getUTCFullYear(),
    startDate: wrappedWindowStartDate(today),
    endDate: wrappedWindowEndDate(today),
    totalMinutes: 0,
    totalWatchCount: 0,
    watchDays: 0,
    longestStreak: 0,
    busiestDay: null,
    formatBreakdown: [
      { mediaType: "movie", label: "movies", minutes: 0, watchCount: 0, share: 0 },
      { mediaType: "show", label: "shows", minutes: 0, watchCount: 0, share: 0 },
    ],
    topTitles: [],
    topGenres: [],
    topActors: [],
    topDirectors: [],
    topCrew: [],
  };
}

function numberDesc(a: number | null, b: number | null): number {
  return (b ?? -1) - (a ?? -1);
}

function numberAsc(a: number | null, b: number | null): number {
  return (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER);
}

function textAsc(a: string, b: string): number {
  return a.localeCompare(b);
}

function titleBreakdownShare(
  totalMinutes: number,
  totalWatchCount: number,
  value: number,
  count: number,
) {
  const denominator = totalMinutes > 0 ? totalMinutes : totalWatchCount;
  if (denominator === 0) return 0;
  return (totalMinutes > 0 ? value : count) / denominator;
}

function buildEpisodeRuntimeIndex(rows: WrappedEpisodeRow[]): EpisodeRuntimeIndex {
  const index: EpisodeRuntimeIndex = new Map();

  for (const row of rows) {
    const current = index.get(row.mediaId) ?? { runtimes: [], averageRuntime: 0 };
    current.runtimes.push(row.runtime);
    index.set(row.mediaId, current);
  }

  for (const value of index.values()) {
    const known = value.runtimes.filter((runtime): runtime is number => runtime !== null);
    value.averageRuntime =
      known.length > 0 ? known.reduce((sum, runtime) => sum + runtime, 0) / known.length : 0;
  }

  return index;
}

function watchMinutes(row: WrappedWatchRow, episodeRuntimeIndex: EpisodeRuntimeIndex): number {
  if (row.mediaType === "movie") {
    return row.runtime ?? 0;
  }

  const indexed = episodeRuntimeIndex.get(row.mediaId);
  if (!indexed) {
    return row.runtime ?? 0;
  }

  if (row.episodeOrdinal === null || row.episodeOrdinal < 1) {
    return indexed.averageRuntime;
  }

  return indexed.runtimes[row.episodeOrdinal - 1] ?? indexed.averageRuntime;
}

function longestStreak(days: Iterable<string>): number {
  const ordered = [...days].sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;

  for (const day of ordered) {
    const now = Date.parse(`${day}T00:00:00Z`);
    if (previous !== null && now - previous === 86_400_000) {
      current += 1;
    } else {
      current = 1;
    }

    best = Math.max(best, current);
    previous = now;
  }

  return best;
}

function indexGenres(rows: WrappedGenreRow[]): Map<string, string[]> {
  const byMedia = new Map<string, string[]>();

  for (const row of rows) {
    const current = byMedia.get(row.mediaId) ?? [];
    current.push(row.genreName);
    byMedia.set(row.mediaId, current);
  }

  return byMedia;
}

function indexCastCredits(rows: WrappedCastRow[]): Map<string, WrappedCredit[]> {
  const byMedia = new Map<string, WrappedCastRow[]>();

  for (const row of rows) {
    const current = byMedia.get(row.mediaId) ?? [];
    current.push(row);
    byMedia.set(row.mediaId, current);
  }

  return new Map(
    [...byMedia.entries()].map(([mediaId, credits]) => [
      mediaId,
      [...credits]
        .sort((a, b) => {
          const episodeRank = numberDesc(a.episodeCount, b.episodeCount);
          if (episodeRank !== 0) return episodeRank;

          const billingRank = numberAsc(a.billingOrder, b.billingOrder);
          if (billingRank !== 0) return billingRank;

          return textAsc(a.name, b.name);
        })
        .slice(0, ACTOR_LIMIT_PER_TITLE)
        .map((credit) => ({
          personId: credit.personId,
          name: credit.name,
          slug: credit.slug,
          profilePath: credit.profilePath,
          subtitle: null,
        })),
    ]),
  );
}

function shouldReplaceCrewCredit(
  current: WrappedCrewRow | undefined,
  candidate: WrappedCrewRow,
  priority: Map<string, number>,
): boolean {
  if (!current) return true;

  const currentPriority = priority.get(current.job) ?? Number.MAX_SAFE_INTEGER;
  const candidatePriority = priority.get(candidate.job) ?? Number.MAX_SAFE_INTEGER;
  if (candidatePriority !== currentPriority) {
    return candidatePriority < currentPriority;
  }

  const episodeRank = numberDesc(candidate.episodeCount, current.episodeCount);
  if (episodeRank !== 0) return episodeRank < 0;

  return textAsc(candidate.name, current.name) < 0;
}

function indexCrewCredits(
  rows: WrappedCrewRow[],
  jobs: readonly string[],
  limitPerTitle: number,
): Map<string, WrappedCredit[]> {
  const priority = new Map(jobs.map((job, index) => [job, index]));
  const deduped = new Map<string, WrappedCrewRow>();

  for (const row of rows) {
    if (!priority.has(row.job)) continue;

    const key = `${row.mediaId}:${row.personId}`;
    const current = deduped.get(key);
    if (shouldReplaceCrewCredit(current, row, priority)) {
      deduped.set(key, row);
    }
  }

  const byMedia = new Map<string, WrappedCrewRow[]>();
  for (const row of deduped.values()) {
    const current = byMedia.get(row.mediaId) ?? [];
    current.push(row);
    byMedia.set(row.mediaId, current);
  }

  return new Map(
    [...byMedia.entries()].map(([mediaId, credits]) => [
      mediaId,
      [...credits]
        .sort((a, b) => {
          const priorityRank = numberAsc(priority.get(a.job) ?? null, priority.get(b.job) ?? null);
          if (priorityRank !== 0) return priorityRank;

          const episodeRank = numberDesc(a.episodeCount, b.episodeCount);
          if (episodeRank !== 0) return episodeRank;

          return textAsc(a.name, b.name);
        })
        .slice(0, limitPerTitle)
        .map((credit) => ({
          personId: credit.personId,
          name: credit.name,
          slug: credit.slug,
          profilePath: credit.profilePath,
          subtitle: credit.job.toLowerCase(),
        })),
    ]),
  );
}

function addGenres(
  stats: Map<string, WrappedGenreAccumulator>,
  names: string[],
  minutes: number,
): void {
  if (names.length === 0) return;

  const sharedMinutes = minutes / names.length;
  for (const name of names) {
    const current = stats.get(name) ?? { name, minutes: 0, watchCount: 0 };
    current.minutes += sharedMinutes;
    current.watchCount += 1;
    stats.set(name, current);
  }
}

function addPeople(
  stats: Map<string, WrappedPersonAccumulator>,
  credits: WrappedCredit[],
  mediaId: string,
  minutes: number,
): void {
  if (credits.length === 0) return;

  const sharedMinutes = minutes / credits.length;
  for (const credit of credits) {
    const current = stats.get(credit.personId) ?? {
      personId: credit.personId,
      name: credit.name,
      slug: credit.slug,
      profilePath: credit.profilePath,
      minutes: 0,
      watchCount: 0,
      mediaIds: new Set<string>(),
      subtitleCounts: new Map<string, number>(),
    };

    current.minutes += sharedMinutes;
    current.watchCount += 1;
    current.mediaIds.add(mediaId);

    if (credit.subtitle) {
      current.subtitleCounts.set(
        credit.subtitle,
        (current.subtitleCounts.get(credit.subtitle) ?? 0) + 1,
      );
    }

    stats.set(credit.personId, current);
  }
}

function favoriteSubtitle(subtitles: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = -1;

  for (const [subtitle, count] of subtitles) {
    if (
      count > bestCount ||
      (count === bestCount && best !== null && textAsc(subtitle, best) < 0)
    ) {
      best = subtitle;
      bestCount = count;
    }
  }

  return best;
}

function finalizeTitles(values: Iterable<WrappedTitleAccumulator>): WrappedTitleStat[] {
  return [...values]
    .sort((a, b) => {
      const minuteRank = numberDesc(a.minutes, b.minutes);
      if (minuteRank !== 0) return minuteRank;

      const watchRank = numberDesc(a.watchCount, b.watchCount);
      if (watchRank !== 0) return watchRank;

      const scoreRank = numberDesc(a.score100, b.score100);
      if (scoreRank !== 0) return scoreRank;

      return textAsc(a.title, b.title);
    })
    .slice(0, TOP_TITLE_LIMIT);
}

function finalizeGenres(
  values: Iterable<WrappedGenreAccumulator>,
  totalMinutes: number,
  totalWatchCount: number,
): WrappedGenreStat[] {
  return [...values]
    .sort((a, b) => {
      const minuteRank = numberDesc(a.minutes, b.minutes);
      if (minuteRank !== 0) return minuteRank;

      const watchRank = numberDesc(a.watchCount, b.watchCount);
      if (watchRank !== 0) return watchRank;

      return textAsc(a.name, b.name);
    })
    .slice(0, TOP_GENRE_LIMIT)
    .map((genre) => ({
      ...genre,
      share: titleBreakdownShare(totalMinutes, totalWatchCount, genre.minutes, genre.watchCount),
    }));
}

function finalizePeople(values: Iterable<WrappedPersonAccumulator>): WrappedPersonStat[] {
  return [...values]
    .sort((a, b) => {
      const minuteRank = numberDesc(a.minutes, b.minutes);
      if (minuteRank !== 0) return minuteRank;

      const watchRank = numberDesc(a.watchCount, b.watchCount);
      if (watchRank !== 0) return watchRank;

      const titleRank = numberDesc(a.mediaIds.size, b.mediaIds.size);
      if (titleRank !== 0) return titleRank;

      return textAsc(a.name, b.name);
    })
    .slice(0, TOP_PERSON_LIMIT)
    .map((person) => ({
      personId: person.personId,
      name: person.name,
      slug: person.slug,
      profilePath: person.profilePath,
      minutes: person.minutes,
      watchCount: person.watchCount,
      titleCount: person.mediaIds.size,
      subtitle: favoriteSubtitle(person.subtitleCounts),
    }));
}

export function buildWrappedSummary(input: WrappedBuildInput, today = new Date()): WrappedSummary {
  if (input.watchRows.length === 0) {
    return emptyWrappedSummary(today);
  }

  const summary = emptyWrappedSummary(today);
  const episodeRuntimeIndex = buildEpisodeRuntimeIndex(input.episodeRows);
  const genresByMedia = indexGenres(input.genreRows);
  const actorsByMedia = indexCastCredits(input.castRows);
  const directorsByMedia = indexCrewCredits(
    input.crewRows,
    DIRECTOR_JOBS,
    DIRECTOR_LIMIT_PER_TITLE,
  );
  const crewByMedia = indexCrewCredits(input.crewRows, CREW_JOBS, CREW_LIMIT_PER_TITLE);

  const titleStats = new Map<string, WrappedTitleAccumulator>();
  const genreStats = new Map<string, WrappedGenreAccumulator>();
  const actorStats = new Map<string, WrappedPersonAccumulator>();
  const directorStats = new Map<string, WrappedPersonAccumulator>();
  const crewStats = new Map<string, WrappedPersonAccumulator>();
  const days = new Set<string>();
  const dayStats = new Map<string, WrappedDayAccumulator>();
  const formatStats = new Map<MediaType, WrappedFormatAccumulator>([
    ["movie", { mediaType: "movie", label: "movies", minutes: 0, watchCount: 0 }],
    ["show", { mediaType: "show", label: "shows", minutes: 0, watchCount: 0 }],
  ]);

  for (const row of input.watchRows) {
    const minutes = watchMinutes(row, episodeRuntimeIndex);

    summary.totalMinutes += minutes;
    summary.totalWatchCount += 1;
    days.add(row.watchedOn);

    const format = formatStats.get(row.mediaType)!;
    format.minutes += minutes;
    format.watchCount += 1;

    const day = dayStats.get(row.watchedOn) ?? { date: row.watchedOn, minutes: 0, watchCount: 0 };
    day.minutes += minutes;
    day.watchCount += 1;
    dayStats.set(row.watchedOn, day);

    const title = titleStats.get(row.mediaId) ?? {
      mediaId: row.mediaId,
      mediaType: row.mediaType,
      title: row.title,
      slug: row.slug,
      posterPath: row.posterPath,
      releaseDate: row.releaseDate,
      minutes: 0,
      watchCount: 0,
      score100: row.score100,
    };
    title.minutes += minutes;
    title.watchCount += 1;
    if (title.score100 === null && row.score100 !== null) {
      title.score100 = row.score100;
    }
    titleStats.set(row.mediaId, title);

    addGenres(genreStats, genresByMedia.get(row.mediaId) ?? [], minutes);
    addPeople(actorStats, actorsByMedia.get(row.mediaId) ?? [], row.mediaId, minutes);
    addPeople(directorStats, directorsByMedia.get(row.mediaId) ?? [], row.mediaId, minutes);
    addPeople(crewStats, crewByMedia.get(row.mediaId) ?? [], row.mediaId, minutes);
  }

  summary.watchDays = days.size;
  summary.longestStreak = longestStreak(days);
  summary.busiestDay =
    [...dayStats.values()].sort((a, b) => {
      const minuteRank = numberDesc(a.minutes, b.minutes);
      if (minuteRank !== 0) return minuteRank;

      const watchRank = numberDesc(a.watchCount, b.watchCount);
      if (watchRank !== 0) return watchRank;

      return textAsc(b.date, a.date);
    })[0] ?? null;

  summary.formatBreakdown = [...formatStats.values()].map((format) => ({
    ...format,
    share: titleBreakdownShare(
      summary.totalMinutes,
      summary.totalWatchCount,
      format.minutes,
      format.watchCount,
    ),
  }));
  summary.topTitles = finalizeTitles(titleStats.values());
  summary.topGenres = finalizeGenres(
    genreStats.values(),
    summary.totalMinutes,
    summary.totalWatchCount,
  );
  summary.topActors = finalizePeople(actorStats.values());
  summary.topDirectors = finalizePeople(directorStats.values());
  summary.topCrew = finalizePeople(crewStats.values());

  return summary;
}

async function listWrappedWatchRows(userId: string, startDate: string): Promise<WrappedWatchRow[]> {
  return db
    .select({
      mediaId: watchEvents.mediaId,
      mediaType: watchEvents.mediaType,
      title: media.title,
      slug: media.slug,
      posterPath: media.posterPath,
      releaseDate: media.releaseDate,
      runtime: media.runtime,
      score100: libraryEntries.score100,
      watchedAt: watchEvents.watchedAt,
      watchedOn: watchEvents.watchedOn,
      episodeOrdinal: watchEvents.episodeOrdinal,
    })
    .from(watchEvents)
    .innerJoin(media, eq(watchEvents.mediaId, media.id))
    .leftJoin(
      libraryEntries,
      and(eq(libraryEntries.userId, userId), eq(libraryEntries.mediaId, watchEvents.mediaId)),
    )
    .where(and(eq(watchEvents.userId, userId), gte(watchEvents.watchedOn, startDate)))
    .orderBy(desc(watchEvents.watchedAt));
}

async function listWrappedGenres(mediaIds: readonly string[]): Promise<WrappedGenreRow[]> {
  return selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: mediaGenres.mediaId,
        genreName: genres.name,
      })
      .from(mediaGenres)
      .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
      .where(inArray(mediaGenres.mediaId, batch)),
  );
}

async function listWrappedCast(mediaIds: readonly string[]): Promise<WrappedCastRow[]> {
  return selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: castCredits.mediaId,
        personId: castCredits.personId,
        name: people.name,
        slug: people.slug,
        profilePath: people.profilePath,
        billingOrder: castCredits.billingOrder,
        episodeCount: castCredits.episodeCount,
      })
      .from(castCredits)
      .innerJoin(people, eq(castCredits.personId, people.id))
      .where(inArray(castCredits.mediaId, batch)),
  );
}

async function listWrappedCrew(mediaIds: readonly string[]): Promise<WrappedCrewRow[]> {
  return selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: crewCredits.mediaId,
        personId: crewCredits.personId,
        name: people.name,
        slug: people.slug,
        profilePath: people.profilePath,
        job: crewCredits.job,
        episodeCount: crewCredits.episodeCount,
      })
      .from(crewCredits)
      .innerJoin(people, eq(crewCredits.personId, people.id))
      .where(inArray(crewCredits.mediaId, batch)),
  );
}

async function listWrappedEpisodes(mediaIds: readonly string[]): Promise<WrappedEpisodeRow[]> {
  return selectByIds(mediaIds, (batch) =>
    db
      .select({
        mediaId: episodes.mediaId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        runtime: episodes.runtime,
      })
      .from(episodes)
      .where(inArray(episodes.mediaId, batch))
      .orderBy(asc(episodes.mediaId), asc(episodes.seasonNumber), asc(episodes.episodeNumber)),
  );
}

export async function getWrappedSummary(
  userId: string,
  today = new Date(),
): Promise<WrappedSummary> {
  const watchRows = await listWrappedWatchRows(userId, wrappedWindowStartDate(today));
  if (watchRows.length === 0) {
    return emptyWrappedSummary(today);
  }

  const mediaIds = [...new Set(watchRows.map((row) => row.mediaId))];
  const [genreRows, castRows, crewRows, episodeRows] = await Promise.all([
    listWrappedGenres(mediaIds),
    listWrappedCast(mediaIds),
    listWrappedCrew(mediaIds),
    listWrappedEpisodes(mediaIds),
  ]);

  return buildWrappedSummary(
    {
      watchRows,
      genreRows,
      castRows,
      crewRows,
      episodeRows,
    },
    today,
  );
}
