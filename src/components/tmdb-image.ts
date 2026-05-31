// TMDB serves every image from one CDN with the size baked into the path:
// https://image.tmdb.org/t/p/{size}{path}.

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbImageSize = "w185" | "w342" | "w500" | "original";

export function tmdbImage(path: string, size: TmdbImageSize): string {
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
