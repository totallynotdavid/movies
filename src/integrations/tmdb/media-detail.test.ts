import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMovieDetail, fetchShowDetail } from "./media-detail";
import { fetchSeasonEpisodes } from "./season";

const { tmdbFetch } = vi.hoisted(() => ({
  tmdbFetch: vi.fn<(path: string, params?: Record<string, string>) => Promise<unknown>>(),
}));

vi.mock("./client", () => ({ tmdbFetch }));

beforeEach(() => {
  tmdbFetch.mockReset();
});

describe("TMDB detail parsing", () => {
  it("maps movie details and drops invalid credit rows", async () => {
    tmdbFetch.mockResolvedValueOnce({
      id: 550,
      title: "Fight Club",
      original_title: "Fight Club",
      overview: "A movie.",
      tagline: "",
      poster_path: "/poster.jpg",
      backdrop_path: "/backdrop.jpg",
      release_date: "1999-10-15",
      runtime: 139,
      status: "Released",
      original_language: "en",
      imdb_id: "tt0137523",
      vote_average: 8.4,
      vote_count: 29000,
      popularity: 90,
      genres: [{ id: 18, name: "Drama" }],
      production_companies: [{ id: 508, name: "Regency", logo_path: "", origin_country: "US" }],
      credits: {
        cast: [
          {
            id: 819,
            name: "Edward Norton",
            profile_path: "/ed.jpg",
            gender: 2,
            known_for_department: "Acting",
            popularity: 20,
            credit_id: "cast-1",
            character: "Narrator",
            order: 0,
          },
          {
            id: 1,
            name: "Dropped Actor",
            profile_path: null,
            gender: null,
            known_for_department: "Acting",
            popularity: 1,
            character: "Missing credit id",
            order: 1,
          },
        ],
        crew: [
          {
            id: 7467,
            name: "David Fincher",
            profile_path: "/df.jpg",
            gender: 2,
            known_for_department: "Directing",
            popularity: 10,
            credit_id: "crew-1",
            department: "Directing",
            job: "Director",
          },
          {
            id: 2,
            name: "Dropped Crew",
            profile_path: null,
            gender: null,
            known_for_department: "Crew",
            popularity: 1,
            credit_id: "crew-2",
            department: "Crew",
            job: " ",
          },
        ],
      },
      translations: {
        translations: [
          { iso_639_1: "es", data: { title: "El club de la pelea", name: null } },
          { iso_639_1: "en", data: { title: "Fight Club", name: null } },
          { iso_639_1: "de", data: { title: "", name: null } },
        ],
      },
      release_dates: {
        results: [
          { iso_3166_1: "US", release_dates: [{ certification: "" }, { certification: "R" }] },
        ],
      },
    });

    const detail = await fetchMovieDetail(550);

    expect(tmdbFetch).toHaveBeenCalledWith("/movie/550", {
      append_to_response: "credits,translations,release_dates",
    });
    expect(detail.scalars).toEqual(
      expect.objectContaining({
        title: "Fight Club",
        tagline: null,
        runtime: 139,
        certification: "R",
        imdbId: "tt0137523",
      }),
    );
    expect(detail.genres).toEqual([{ tmdbId: 18, name: "Drama" }]);
    expect(detail.companies).toEqual([
      { tmdbId: 508, kind: "company", name: "Regency", logoPath: null, originCountry: "US" },
    ]);
    expect(detail.cast).toEqual([
      {
        creditId: "cast-1",
        personTmdbId: 819,
        character: "Narrator",
        billingOrder: 0,
        episodeCount: null,
      },
    ]);
    expect(detail.crew).toEqual([
      {
        creditId: "crew-1",
        personTmdbId: 7467,
        department: "Directing",
        job: "Director",
        episodeCount: null,
      },
    ]);
    expect(detail.people.map((person) => person.tmdbId)).toEqual([819, 7467]);
    expect(detail.titles).toEqual([{ languageCode: "es", title: "El club de la pelea" }]);
  });

  it("caps TV cast by credit rows and keeps only hydrated people", async () => {
    const cast = Array.from({ length: 105 }, (_, index) => ({
      id: 10_000 + index,
      name: `Actor ${index}`,
      profile_path: null,
      gender: null,
      known_for_department: "Acting",
      popularity: index,
      order: index,
      roles: [
        {
          credit_id: `role-${index}`,
          character: `Character ${index}`,
          episode_count: 105 - index,
        },
      ],
    }));

    tmdbFetch.mockResolvedValueOnce({
      id: 1399,
      name: "Game of Thrones",
      original_name: "Game of Thrones",
      overview: "A show.",
      tagline: null,
      poster_path: "/got.jpg",
      backdrop_path: null,
      first_air_date: "2011-04-17",
      last_air_date: "2019-05-19",
      number_of_seasons: 8,
      number_of_episodes: 73,
      status: "Ended",
      in_production: false,
      original_language: "en",
      vote_average: 8.5,
      vote_count: 25000,
      popularity: 120,
      genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }],
      production_companies: [
        { id: 3268, name: "HBO", logo_path: "/hbo.png", origin_country: "US" },
      ],
      networks: [{ id: 49, name: "HBO", logo_path: "/hbo.png", origin_country: "US" }],
      seasons: [{ season_number: 0 }, { season_number: 1 }, { season_number: 2 }],
      aggregate_credits: {
        cast,
        crew: [
          {
            id: 12_000,
            name: "Writer One",
            profile_path: null,
            gender: null,
            known_for_department: "Writing",
            popularity: 5,
            department: "Writing",
            jobs: [{ credit_id: "job-1", job: "Writer", episode_count: 10 }],
          },
        ],
      },
      translations: { translations: [] },
      content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-MA" }] },
      external_ids: { imdb_id: "tt0944947" },
    });

    const detail = await fetchShowDetail(1399);

    expect(tmdbFetch).toHaveBeenCalledWith("/tv/1399", {
      append_to_response: "aggregate_credits,translations,content_ratings,external_ids",
    });
    expect(detail.scalars).toEqual(
      expect.objectContaining({
        title: "Game of Thrones",
        episodeCount: 73,
        certification: "TV-MA",
        inProduction: 0,
      }),
    );
    expect(detail.cast).toHaveLength(100);
    expect(detail.cast.at(0)).toEqual(
      expect.objectContaining({ creditId: "role-0", episodeCount: 105 }),
    );
    expect(detail.cast.at(-1)).toEqual(
      expect.objectContaining({ creditId: "role-99", episodeCount: 6 }),
    );
    expect(detail.cast.some((row) => row.creditId === "role-100")).toBe(false);
    expect(detail.crew).toEqual([
      {
        creditId: "job-1",
        personTmdbId: 12_000,
        department: "Writing",
        job: "Writer",
        episodeCount: 10,
      },
    ]);
    expect(detail.people).toHaveLength(101);
    expect(detail.seasonNumbers).toEqual([1, 2]);
  });

  it("keeps valid season episodes when TMDB returns malformed rows", async () => {
    tmdbFetch.mockResolvedValueOnce({
      episodes: [
        { episode_number: 1, name: "Pilot", runtime: 42, air_date: "2020-01-01" },
        { name: "Missing episode number", runtime: 44, air_date: "2020-01-08" },
        { episode_number: 3, name: "", runtime: "unknown", air_date: "" },
      ],
    });

    await expect(fetchSeasonEpisodes(1399, 1)).resolves.toEqual([
      { seasonNumber: 1, episodeNumber: 1, name: "Pilot", runtime: 42, airDate: "2020-01-01" },
      { seasonNumber: 1, episodeNumber: 3, name: null, runtime: null, airDate: null },
    ]);
    expect(tmdbFetch).toHaveBeenCalledWith("/tv/1399/season/1");
  });
});
