import { describe, expect, it } from "vitest";
import { deriveShowProgress, resolveWatchedEpisodes, type EpisodeRef } from "./watch-state";

const ep = (seasonNumber: number, episodeNumber: number): EpisodeRef => ({
  seasonNumber,
  episodeNumber,
});

const aired = [ep(1, 1), ep(1, 2), ep(1, 3)];

describe("deriveShowProgress", () => {
  it("counts watched aired episodes and points at the next one", () => {
    const progress = deriveShowProgress([ep(1, 1), ep(1, 2)], aired);
    expect(progress.watchedEpisodeCount).toBe(2);
    expect(progress.airedEpisodeCount).toBe(3);
    expect(progress.nextEpisode).toEqual(ep(1, 3));
    expect(progress.allAiredWatched).toBe(false);
  });

  it("ignores gaps and rewatches (next is the first unwatched in airing order)", () => {
    // Out of order with a duplicate watch. Episode 2 remains the next unwatched.
    const progress = deriveShowProgress([ep(1, 3), ep(1, 1), ep(1, 1)], aired);
    expect(progress.watchedEpisodeCount).toBe(2);
    expect(progress.nextEpisode).toEqual(ep(1, 2));
  });

  it("marks completion when every aired episode is watched", () => {
    const progress = deriveShowProgress([ep(1, 1), ep(1, 2), ep(1, 3)], aired);
    expect(progress.allAiredWatched).toBe(true);
    expect(progress.nextEpisode).toBeNull();
  });

  it("a rewatch of an earlier episode does not complete the show", () => {
    // Two of three aired are watched, then episode 1 is logged again.
    // Completion must stay false because episode 3 is still unwatched.
    const progress = deriveShowProgress([ep(1, 1), ep(1, 2), ep(1, 1)], aired);
    expect(progress.allAiredWatched).toBe(false);
    expect(progress.watchedEpisodeCount).toBe(2);
    expect(progress.nextEpisode).toEqual(ep(1, 3));
  });

  it("counts watched but cannot project next when the catalog is empty", () => {
    const progress = deriveShowProgress([ep(1, 1), ep(1, 2)], []);
    expect(progress.watchedEpisodeCount).toBe(2);
    expect(progress.airedEpisodeCount).toBeNull();
    expect(progress.nextEpisode).toBeNull();
    expect(progress.allAiredWatched).toBe(false);
  });

  it("advances progress with provisional watches until the episode list hydrates", () => {
    const progress = deriveShowProgress([], [], 2);
    expect(progress.watchedEpisodeCount).toBe(2);
    expect(progress.airedEpisodeCount).toBeNull();
    expect(progress.nextEpisode).toBeNull();
  });

  it("reconciles provisional watches onto the earliest unwatched aired episodes", () => {
    const progress = deriveShowProgress([ep(1, 2)], aired, 1);
    expect(progress.watchedEpisodeCount).toBe(2);
    expect(progress.nextEpisode).toEqual(ep(1, 3));
    expect(resolveWatchedEpisodes([ep(1, 2)], aired, 1)).toEqual([ep(1, 1), ep(1, 2)]);
  });

  it("caps reconciled provisional watches at the aired episode list", () => {
    const progress = deriveShowProgress([], aired, 10);
    expect(progress.watchedEpisodeCount).toBe(3);
    expect(progress.allAiredWatched).toBe(true);
    expect(progress.nextEpisode).toBeNull();
  });
});
