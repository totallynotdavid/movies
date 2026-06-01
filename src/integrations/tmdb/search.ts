import * as v from "valibot";
import { slugify } from "@/shared/slug";
import { tmdbFetch } from "./client";
import { Id, NullNum, NullStr, looseArray, parse } from "./parse";
import type { MediaType } from "@/domain/catalog/media";

export type TmdbMediaResult = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  seasonCount: number | null;
  episodeCount: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  slug: string;
};

// Only movie/tv hits are kept; person results (and rows missing an id) drop at
// parse.
const MultiItem = v.object({
  id: Id,
  media_type: v.picklist(["movie", "tv"]),
  title: NullStr,
  name: NullStr,
  original_title: NullStr,
  original_name: NullStr,
  overview: NullStr,
  poster_path: NullStr,
  backdrop_path: NullStr,
  release_date: NullStr,
  first_air_date: NullStr,
  vote_average: NullNum,
  vote_count: NullNum,
  popularity: NullNum,
});
const MultiSearch = v.object({ results: looseArray(MultiItem) });

type MultiItemPayload = v.InferOutput<typeof MultiItem>;

function mapItem(item: MultiItemPayload): TmdbMediaResult | null {
  const title = item.title ?? item.name;
  if (!title) return null;

  return {
    mediaType: item.media_type === "tv" ? "show" : "movie",
    tmdbId: item.id,
    title,
    originalTitle: item.original_title ?? item.original_name,
    overview: item.overview,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.release_date ?? item.first_air_date,
    seasonCount: null,
    episodeCount: null,
    voteAverage: item.vote_average,
    voteCount: item.vote_count,
    popularity: item.popularity,
    slug: slugify(title, item.id),
  };
}

export async function searchTmdbMedia(input: { query: string; limit?: number }) {
  const query = input.query.trim();
  if (!query) return [];

  const pageSize = Math.min(Math.max(input.limit ?? 20, 1), 20);
  const raw = await tmdbFetch<unknown>("/search/multi", {
    query,
    include_adult: "false",
    page: "1",
  });

  return parse(MultiSearch, raw)
    .results.map(mapItem)
    .filter((item): item is TmdbMediaResult => item !== null)
    .slice(0, pageSize);
}

const ShowTotals = v.object({ number_of_seasons: NullNum, number_of_episodes: NullNum });

export async function fetchTmdbShowTotals(input: { tmdbId: number }) {
  const raw = await tmdbFetch<unknown>(`/tv/${input.tmdbId}`);
  const totals = parse(ShowTotals, raw);
  return {
    seasonCount: totals.number_of_seasons,
    episodeCount: totals.number_of_episodes,
  };
}
