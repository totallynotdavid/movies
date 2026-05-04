export const SESSION_COOKIE = 'movie_session'
export const CSRF_COOKIE = 'movie_csrf'

export function setAuthCookies(event: any, input: {
  sessionToken: string
  csrfToken: string
  expires: Date
}) {
  const secure = process.env.NODE_ENV === 'production'
  setCookie(event, SESSION_COOKIE, input.sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: input.expires,
  })
  setCookie(event, CSRF_COOKIE, input.csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: input.expires,
  })
}

export function clearAuthCookies(event: any) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  deleteCookie(event, CSRF_COOKIE, { path: '/' })
}
