export const TMDB_ALLOWED_HOSTS = ['api.themoviedb.org']

export function assertAllowedFetchUrl(url: URL): void {
  if (!TMDB_ALLOWED_HOSTS.includes(url.hostname)) {
    throw createError({
      statusCode: 400,
      statusMessage: `external_fetch_host_not_allowed:${url.hostname}`,
    })
  }
}
