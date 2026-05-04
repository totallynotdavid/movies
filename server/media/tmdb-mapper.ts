import type { SeedMediaEntity, SeedMediaType } from '#shared/types/media'

export interface MediaEntityRow {
  id: string
  type: SeedMediaType
  tmdbId: number
  slug: string
  title: string
  originalTitle: string | null
  overview: string | null
  posterPath: string | null
  backdropPath: string | null
  genreIds: number[]
  genreNames: string[]
  releaseDate: string | null
  firstAirDate: string | null
  voteAverage: number | null
  voteCount: number | null
  popularity: number | null
  fetchedAt: string
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || fallback
}

export function mapSeedEntity(seed: SeedMediaEntity): MediaEntityRow {
  return {
    ...seed,
    slug: `${seed.type}-${slugify(seed.title, String(seed.tmdbId))}-${seed.tmdbId}`,
  }
}

export function mapTmdbSearchResult(input: any, type: SeedMediaType): MediaEntityRow | null {
  const tmdbId = Number(input.id)
  const title = type === 'movie' ? input.title : input.name
  if (!Number.isFinite(tmdbId) || !title) return null

  const originalTitle = type === 'movie' ? input.original_title : input.original_name
  const releaseDate = type === 'movie' ? input.release_date : null
  const firstAirDate = type === 'show' ? input.first_air_date : null
  const genreIds = Array.isArray(input.genre_ids)
    ? input.genre_ids.filter((id: unknown): id is number => Number.isFinite(id))
    : []

  return {
    id: `tmdb:${type}:${tmdbId}`,
    type,
    tmdbId,
    slug: `${type}-${slugify(title, String(tmdbId))}-${tmdbId}`,
    title,
    originalTitle: originalTitle || null,
    overview: input.overview || null,
    posterPath: input.poster_path || null,
    backdropPath: input.backdrop_path || null,
    genreIds,
    genreNames: [],
    releaseDate: releaseDate || null,
    firstAirDate: firstAirDate || null,
    voteAverage: Number.isFinite(input.vote_average) ? input.vote_average : null,
    voteCount: Number.isFinite(input.vote_count) ? input.vote_count : null,
    popularity: Number.isFinite(input.popularity) ? input.popularity : null,
    fetchedAt: new Date().toISOString(),
  }
}

export function mapTmdbDetails(input: any, type: SeedMediaType): MediaEntityRow | null {
  const mapped = mapTmdbSearchResult(
    {
      ...input,
      genre_ids: Array.isArray(input.genres) ? input.genres.map((genre: any) => genre.id) : input.genre_ids,
    },
    type,
  )
  if (!mapped) return null

  mapped.genreNames = Array.isArray(input.genres)
    ? input.genres.map((genre: any) => genre.name).filter(Boolean)
    : []

  return mapped
}
