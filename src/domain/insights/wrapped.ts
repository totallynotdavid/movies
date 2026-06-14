import { castByMedia, crewByMedia, type CastRow, type CrewRow } from "@/domain/catalog/credits";
import { genresByMedia } from "@/domain/catalog/metadata";
import { episodeRuntimesByMedia, type EpisodeRuntime } from "@/domain/catalog/episodes";
import {
  listWatchHistory,
  listWatchYears,
  type WatchHistoryRow,
} from "@/domain/tracking/watch-history";
import type { MediaType } from "@/domain/catalog/media";

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

type EpisodeRuntimeIndex = Map<
  string,
  {
    byEpisode: Map<string, number>;
    averageRuntime: number;
  }
>;

function episodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

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
  watchRows: WatchHistoryRow[];
  episodeRows: EpisodeRuntime[];
  genresByMedia: Map<string, string[]>;
  castRows: CastRow[];
  crewRows: CrewRow[];
};

// `watchedOn` is already a local calendar day (YYYY-MM-DD), so a year is a plain
// half-open string range; no timezone math is needed for the window itself.
export function wrappedYearWindow(year: number): { since: string; until: string } {
  return { since: `${year}-01-01`, until: `${year + 1}-01-01` };
}

// Invalid or missing IANA zones fall back to UTC.
export function zonedYearMonth(
  today: Date,
  timeZone: string | null,
): { year: number; month: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone ?? "UTC",
      year: "numeric",
      month: "numeric",
    }).formatToParts(today);
    return {
      year: Number(parts.find((p) => p.type === "year")?.value),
      month: Number(parts.find((p) => p.type === "month")?.value),
    };
  } catch {
    return { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1 };
  }
}

// Which year a bare /wrapped (or public profile root) should default to. Resolved
// in the user's zone so a New Year's-Eve watch lands in the right year. During
// January we surface the just-completed year (full and shareable) instead of a
// near-empty current year; explicit ?year navigation overrides this.
export function resolveWrappedYear(today: Date, timeZone: string | null): number {
  const { year, month } = zonedYearMonth(today, timeZone);
  return month === 1 ? year - 1 : year;
}

// A public year recap is shareable once the year is complete enough to be worth
// sharing: any past year always, the current year only from December (so a
// mid-year recap is never half-empty), never a future year. The owner still sees
// the live, in-progress current year on the private /wrapped regardless.
export function isYearRecapPublic(year: number, today: Date, timeZone: string | null): boolean {
  const { year: current, month } = zonedYearMonth(today, timeZone);
  if (year > current) return false;
  if (year < current) return true;
  return month >= 12;
}

function emptyWrappedSummary(year: number): WrappedSummary {
  return {
    year,
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

type Comparator<T> = (a: T, b: T) => number;

// Tie-break ladder: the first non-zero comparator decides. Replaces the repeated
// `const rank = ...; if (rank !== 0) return rank;` chains.
function compareBy<T>(...comparators: Comparator<T>[]): Comparator<T> {
  return (a, b) => {
    for (const compare of comparators) {
      const rank = compare(a, b);
      if (rank !== 0) return rank;
    }
    return 0;
  };
}

// Bucket rows by a derived key, preserving encounter order within each bucket.
function groupBy<T, K>(rows: Iterable<T>, key: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = groups.get(k) ?? [];
    list.push(row);
    groups.set(k, list);
  }
  return groups;
}

// A bucket's share of the whole. Watch time is the natural denominator; a library
// with no runtime data anywhere falls back to watch counts so bars still render.
function shareOf(
  totalMinutes: number,
  totalWatchCount: number,
  minutes: number,
  watchCount: number,
) {
  const useMinutes = totalMinutes > 0;
  const denominator = useMinutes ? totalMinutes : totalWatchCount;
  if (denominator === 0) return 0;
  return (useMinutes ? minutes : watchCount) / denominator;
}

function buildEpisodeRuntimeIndex(rows: EpisodeRuntime[]): EpisodeRuntimeIndex {
  const index: EpisodeRuntimeIndex = new Map();

  for (const [mediaId, group] of groupBy(rows, (row) => row.mediaId)) {
    const byEpisode = new Map<string, number>();
    for (const row of group) {
      if (row.runtime !== null) {
        byEpisode.set(episodeKey(row.seasonNumber, row.episodeNumber), row.runtime);
      }
    }
    const known = [...byEpisode.values()];
    const averageRuntime =
      known.length > 0 ? known.reduce((sum, runtime) => sum + runtime, 0) / known.length : 0;
    index.set(mediaId, { byEpisode, averageRuntime });
  }

  return index;
}

// Resolve an episode watch to its real runtime by (season, episode) identity,
// falling back to the show's average when that episode's runtime is unknown.
function watchMinutes(row: WatchHistoryRow, episodeRuntimeIndex: EpisodeRuntimeIndex): number {
  if (row.mediaType === "movie") {
    return row.runtime ?? 0;
  }

  const indexed = episodeRuntimeIndex.get(row.mediaId);
  if (!indexed) {
    return row.runtime ?? 0;
  }

  if (row.seasonNumber === null || row.episodeNumber === null) {
    return indexed.averageRuntime;
  }

  return (
    indexed.byEpisode.get(episodeKey(row.seasonNumber, row.episodeNumber)) ?? indexed.averageRuntime
  );
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

const compareCast = compareBy<CastRow>(
  (a, b) => numberDesc(a.episodeCount, b.episodeCount),
  (a, b) => numberAsc(a.billingOrder, b.billingOrder),
  (a, b) => textAsc(a.name, b.name),
);

function indexCastRows(rows: CastRow[]): Map<string, WrappedCredit[]> {
  return new Map(
    [...groupBy(rows, (row) => row.mediaId)].map(([mediaId, credits]) => [
      mediaId,
      [...credits]
        .sort(compareCast)
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

// Job priority (lower index = preferred) drives both which job represents a
// person and the within-title ordering, so one comparator serves both.
function compareCrew(priority: Map<string, number>): Comparator<CrewRow> {
  return compareBy(
    (a, b) => numberAsc(priority.get(a.job) ?? null, priority.get(b.job) ?? null),
    (a, b) => numberDesc(a.episodeCount, b.episodeCount),
    (a, b) => textAsc(a.name, b.name),
  );
}

function indexCrewRows(
  rows: CrewRow[],
  jobs: readonly string[],
  limitPerTitle: number,
): Map<string, WrappedCredit[]> {
  const priority = new Map(jobs.map((job, index) => [job, index]));
  const compare = compareCrew(priority);

  // One row per (media, person): keep the highest-priority job they hold.
  const deduped = new Map<string, CrewRow>();
  for (const row of rows) {
    if (!priority.has(row.job)) continue;
    const key = `${row.mediaId}:${row.personId}`;
    const current = deduped.get(key);
    if (!current || compare(row, current) < 0) deduped.set(key, row);
  }

  return new Map(
    [...groupBy(deduped.values(), (row) => row.mediaId)].map(([mediaId, credits]) => [
      mediaId,
      [...credits]
        .sort(compare)
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

const compareTitles = compareBy<WrappedTitleStat>(
  (a, b) => numberDesc(a.minutes, b.minutes),
  (a, b) => numberDesc(a.watchCount, b.watchCount),
  (a, b) => numberDesc(a.score100, b.score100),
  (a, b) => textAsc(a.title, b.title),
);

function finalizeTitles(values: Iterable<WrappedTitleStat>): WrappedTitleStat[] {
  return [...values].sort(compareTitles).slice(0, TOP_TITLE_LIMIT);
}

const compareGenres = compareBy<WrappedGenreAccumulator>(
  (a, b) => numberDesc(a.minutes, b.minutes),
  (a, b) => numberDesc(a.watchCount, b.watchCount),
  (a, b) => textAsc(a.name, b.name),
);

function finalizeGenres(
  values: Iterable<WrappedGenreAccumulator>,
  totalMinutes: number,
  totalWatchCount: number,
): WrappedGenreStat[] {
  return [...values]
    .sort(compareGenres)
    .slice(0, TOP_GENRE_LIMIT)
    .map((genre) => ({
      ...genre,
      share: shareOf(totalMinutes, totalWatchCount, genre.minutes, genre.watchCount),
    }));
}

const comparePeople = compareBy<WrappedPersonAccumulator>(
  (a, b) => numberDesc(a.minutes, b.minutes),
  (a, b) => numberDesc(a.watchCount, b.watchCount),
  (a, b) => numberDesc(a.mediaIds.size, b.mediaIds.size),
  (a, b) => textAsc(a.name, b.name),
);

function finalizePeople(values: Iterable<WrappedPersonAccumulator>): WrappedPersonStat[] {
  return [...values]
    .sort(comparePeople)
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

const compareDays = compareBy<WrappedDayStat>(
  (a, b) => numberDesc(a.minutes, b.minutes),
  (a, b) => numberDesc(a.watchCount, b.watchCount),
  (a, b) => textAsc(b.date, a.date), // ties go to the later date
);

export function buildWrappedSummary(input: WrappedBuildInput, year: number): WrappedSummary {
  if (input.watchRows.length === 0) {
    return emptyWrappedSummary(year);
  }

  const summary = emptyWrappedSummary(year);
  const episodeRuntimeIndex = buildEpisodeRuntimeIndex(input.episodeRows);
  const genresOf = input.genresByMedia;
  const actorsByMedia = indexCastRows(input.castRows);
  const directorsByMedia = indexCrewRows(input.crewRows, DIRECTOR_JOBS, DIRECTOR_LIMIT_PER_TITLE);
  const crewByMedia = indexCrewRows(input.crewRows, CREW_JOBS, CREW_LIMIT_PER_TITLE);

  const titleStats = new Map<string, WrappedTitleStat>();
  const genreStats = new Map<string, WrappedGenreAccumulator>();
  const actorStats = new Map<string, WrappedPersonAccumulator>();
  const directorStats = new Map<string, WrappedPersonAccumulator>();
  const crewStats = new Map<string, WrappedPersonAccumulator>();
  const days = new Set<string>();
  const dayStats = new Map<string, WrappedDayStat>();
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
    titleStats.set(row.mediaId, title);

    addGenres(genreStats, genresOf.get(row.mediaId) ?? [], minutes);
    addPeople(actorStats, actorsByMedia.get(row.mediaId) ?? [], row.mediaId, minutes);
    addPeople(directorStats, directorsByMedia.get(row.mediaId) ?? [], row.mediaId, minutes);
    addPeople(crewStats, crewByMedia.get(row.mediaId) ?? [], row.mediaId, minutes);
  }

  summary.watchDays = days.size;
  summary.longestStreak = longestStreak(days);
  summary.busiestDay = [...dayStats.values()].sort(compareDays)[0] ?? null;

  summary.formatBreakdown = [...formatStats.values()].map((format) => ({
    ...format,
    share: shareOf(
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

export async function getWrappedSummary(
  userId: string,
  opts: { year?: number; today?: Date; timeZone?: string | null } = {},
): Promise<WrappedSummary> {
  const today = opts.today ?? new Date();
  const year = opts.year ?? resolveWrappedYear(today, opts.timeZone ?? null);
  const { since, until } = wrappedYearWindow(year);

  const watchRows = await listWatchHistory(userId, { since, until });
  if (watchRows.length === 0) {
    return emptyWrappedSummary(year);
  }

  const mediaIds = [...new Set(watchRows.map((row) => row.mediaId))];
  const [genresOf, castRows, crewRows, episodeRows] = await Promise.all([
    genresByMedia(mediaIds),
    castByMedia(mediaIds),
    crewByMedia(mediaIds),
    episodeRuntimesByMedia(mediaIds),
  ]);

  return buildWrappedSummary(
    { watchRows, genresByMedia: genresOf, castRows, crewRows, episodeRows },
    year,
  );
}

export async function wrappedYearsForUser(userId: string): Promise<number[]> {
  return listWatchYears(userId);
}
