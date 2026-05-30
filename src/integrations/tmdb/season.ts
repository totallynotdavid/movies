import * as v from "valibot";
import { tmdbFetch } from "./client";
import { Id, NullNum, NullStr, looseArray, parse } from "./parse";
import type { EpisodeInput } from "../../../shared/types/metadata";

const SeasonDetail = v.object({
  episodes: looseArray(
    v.object({
      episode_number: Id,
      name: NullStr,
      runtime: NullNum,
      air_date: NullStr,
    }),
  ),
});

export async function fetchSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number,
): Promise<EpisodeInput[]> {
  const raw = await tmdbFetch<unknown>(`/tv/${tmdbId}/season/${seasonNumber}`);
  const season = parse(SeasonDetail, raw);
  return season.episodes.map((episode) => ({
    seasonNumber,
    episodeNumber: episode.episode_number,
    name: episode.name,
    runtime: episode.runtime,
    airDate: episode.air_date,
  }));
}
