import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const token = process.env.NUXT_TMDB_READ_ACCESS_TOKEN
if (!token) {
  throw new Error('NUXT_TMDB_READ_ACCESS_TOKEN is required to refresh the seed fixture.')
}

async function tmdb(path: string) {
  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error(`TMDB refresh failed: ${response.status}`)
  }
  return await response.json()
}

function mapEntry(result: any, type: 'movie' | 'show') {
  const tmdbId = Number(result.id)
  const title = type === 'movie' ? result.title : result.name
  return {
    id: `tmdb:${type}:${tmdbId}`,
    type,
    tmdbId,
    title,
    originalTitle: (type === 'movie' ? result.original_title : result.original_name) || null,
    overview: result.overview || null,
    posterPath: result.poster_path || null,
    backdropPath: result.backdrop_path || null,
    genreIds: Array.isArray(result.genre_ids) ? result.genre_ids : [],
    genreNames: [],
    releaseDate: type === 'movie' ? result.release_date || null : null,
    firstAirDate: type === 'show' ? result.first_air_date || null : null,
    voteAverage: Number.isFinite(result.vote_average) ? result.vote_average : null,
    voteCount: Number.isFinite(result.vote_count) ? result.vote_count : null,
    popularity: Number.isFinite(result.popularity) ? result.popularity : null,
    fetchedAt: new Date().toISOString(),
  }
}

const [movies, shows] = await Promise.all([
  tmdb('/movie/popular?language=en-US&page=1'),
  tmdb('/tv/popular?language=en-US&page=1'),
])
const entries = [
  ...(movies.results || []).map((result: any) => mapEntry(result, 'movie')),
  ...(shows.results || []).map((result: any) => mapEntry(result, 'show')),
]

await writeFile(resolve(process.cwd(), 'server/assets/seed/tmdb-media.seed.json'), `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  source: 'tmdb',
  counts: {
    movies: movies.results?.length || 0,
    shows: shows.results?.length || 0,
  },
  entries,
}, null, 2)}\n`)
console.log(`Refreshed ${entries.length} seed entries.`)
