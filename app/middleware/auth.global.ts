export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { data } = await useFetch('/api/auth/session', {
    key: 'auth-session',
    credentials: 'include',
  })

  if (!data.value?.user && to.path === '/library') {
    return navigateTo('/login')
  }
})
