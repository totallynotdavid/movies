import { describe, expect, it } from "vite-plus/test";
import {
  deriveShowProgress,
  pickEpisodeToLog,
  resolveWatchedEpisodes,
  type ShowProgress,
} from "./progress";
import type { EpisodeRef } from "@/shared/tracking";

const ep = (seasonNumber: number, episodeNumber: number): EpisodeRef => ({
  seasonNumber,
  episodeNumber,
});

const aired = [ep(1, 1), ep(1, 2), ep(1, 3)];

describe("deriveShowProgress", () => {
  it.each([
    {
      name: "counts watched aired episodes and points at the next one",
      watched: [ep(1, 1), ep(1, 2)],
      catalog: aired,
      expected: {
        watchedEpisodeCount: 2,
        airedEpisodeCount: 3,
        nextEpisode: ep(1, 3),
        allAiredWatched: false,
      },
    },
    {
      name: "ignores gaps and rewatches, so next is the first unwatched in airing order",
      watched: [ep(1, 3), ep(1, 1), ep(1, 1)],
      catalog: aired,
      expected: {
        watchedEpisodeCount: 2,
        airedEpisodeCount: 3,
        nextEpisode: ep(1, 2),
        allAiredWatched: false,
      },
    },
    {
      name: "orders aired input before deriving the next episode",
      watched: [ep(1, 1)],
      catalog: [ep(1, 3), ep(1, 1), ep(1, 2)],
      expected: {
        watchedEpisodeCount: 1,
        airedEpisodeCount: 3,
        nextEpisode: ep(1, 2),
        allAiredWatched: false,
      },
    },
    {
      name: "marks completion when every aired episode is watched",
      watched: [ep(1, 1), ep(1, 2), ep(1, 3)],
      catalog: aired,
      expected: {
        watchedEpisodeCount: 3,
        airedEpisodeCount: 3,
        nextEpisode: null,
        allAiredWatched: true,
      },
    },
    {
      name: "counts watched but cannot project next when the catalog is empty",
      watched: [ep(1, 1), ep(1, 2)],
      catalog: [],
      expected: {
        watchedEpisodeCount: 2,
        airedEpisodeCount: null,
        nextEpisode: null,
        allAiredWatched: false,
      },
    },
    {
      name: "advances progress with provisional watches until the episode list hydrates",
      watched: [],
      catalog: [],
      provisional: 2,
      expected: {
        watchedEpisodeCount: 2,
        airedEpisodeCount: null,
        nextEpisode: null,
        allAiredWatched: false,
      },
    },
    {
      name: "reconciles provisional watches onto the earliest unwatched aired episodes",
      watched: [ep(1, 2)],
      catalog: aired,
      provisional: 1,
      expected: {
        watchedEpisodeCount: 2,
        airedEpisodeCount: 3,
        nextEpisode: ep(1, 3),
        allAiredWatched: false,
      },
    },
    {
      name: "caps reconciled provisional watches at the aired episode list",
      watched: [],
      catalog: aired,
      provisional: 10,
      expected: {
        watchedEpisodeCount: 3,
        airedEpisodeCount: 3,
        nextEpisode: null,
        allAiredWatched: true,
      },
    },
  ])("$name", ({ watched, catalog, provisional, expected }) => {
    expect(deriveShowProgress(watched, catalog, provisional)).toEqual(expected);
  });

  it("resolves provisional watches to the earliest unwatched episodes", () => {
    expect(resolveWatchedEpisodes([ep(1, 2)], aired, 1)).toEqual([ep(1, 1), ep(1, 2)]);
  });
});

const progressOf = (overrides: Partial<ShowProgress> = {}): ShowProgress => ({
  watchedEpisodeCount: 0,
  airedEpisodeCount: null,
  nextEpisode: null,
  allAiredWatched: false,
  ...overrides,
});

describe("pickEpisodeToLog", () => {
  it.each([
    {
      name: "uses the requested explicit episode when present",
      progress: progressOf(),
      total: 8,
      requested: ep(2, 3),
      expected: { ok: true, value: ep(2, 3) },
    },
    {
      name: "uses the next aired episode when the catalog is loaded",
      progress: progressOf({
        watchedEpisodeCount: 2,
        airedEpisodeCount: 4,
        nextEpisode: ep(1, 3),
      }),
      total: 8,
      requested: undefined,
      expected: { ok: true, value: ep(1, 3) },
    },
    {
      name: "allows a provisional quick-log while the episode list is still empty",
      progress: progressOf({ watchedEpisodeCount: 1 }),
      total: null,
      requested: undefined,
      expected: { ok: true, value: null },
    },
    {
      name: "stops provisional quick-logs at the known episode total",
      progress: progressOf({ watchedEpisodeCount: 8 }),
      total: 8,
      requested: undefined,
      expected: { ok: false, error: { kind: "already_at_episode_total", total: 8 } },
    },
    {
      name: "stops quick-logs when every aired episode is already watched",
      progress: progressOf({
        watchedEpisodeCount: 3,
        airedEpisodeCount: 3,
        allAiredWatched: true,
      }),
      total: 8,
      requested: undefined,
      expected: { ok: false, error: { kind: "already_at_episode_total", total: 3 } },
    },
  ])("$name", ({ progress, total, requested, expected }) => {
    expect(pickEpisodeToLog(progress, total, requested)).toEqual(expected);
  });
});
