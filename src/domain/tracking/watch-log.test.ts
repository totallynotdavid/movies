import { describe, expect, it } from "vitest";
import { pickEpisodeToLog } from "./watch-log";
import type { ShowProgress } from "./watch-state";

const progress = (overrides: Partial<ShowProgress> = {}): ShowProgress => ({
  watchedEpisodeCount: 0,
  airedEpisodeCount: null,
  nextEpisode: null,
  allAiredWatched: false,
  ...overrides,
});

describe("pickEpisodeToLog", () => {
  it("uses the requested explicit episode when present", () => {
    const result = pickEpisodeToLog(progress(), 8, { seasonNumber: 2, episodeNumber: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ seasonNumber: 2, episodeNumber: 3 });
  });

  it("falls back to the next aired episode when the catalog is loaded", () => {
    const result = pickEpisodeToLog(
      progress({
        watchedEpisodeCount: 2,
        airedEpisodeCount: 4,
        nextEpisode: { seasonNumber: 1, episodeNumber: 3 },
      }),
      8,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ seasonNumber: 1, episodeNumber: 3 });
  });

  it("allows a provisional quick-log while the episode list is still empty", () => {
    const result = pickEpisodeToLog(progress({ watchedEpisodeCount: 1 }), null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("stops provisional quick-logs at the known episode total", () => {
    const result = pickEpisodeToLog(progress({ watchedEpisodeCount: 8 }), 8);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "already_at_episode_total", total: 8 });
  });

  it("stops quick-logs when every aired episode is already watched", () => {
    const result = pickEpisodeToLog(
      progress({
        watchedEpisodeCount: 3,
        airedEpisodeCount: 3,
        nextEpisode: null,
        allAiredWatched: true,
      }),
      8,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "already_at_episode_total", total: 3 });
  });
});
