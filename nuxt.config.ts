if (process.env.VERCEL) {
  throw new Error("Vercel deployment is deferred until a Vercel-native DB adapter is added.");
}

export default defineNuxtConfig({
  compatibilityDate: "2026-05-02",
  devtools: { enabled: true },

  modules: [
    "@unocss/nuxt",
    "@nuxtjs/color-mode",
    "@nuxt/image",
    "@vueuse/nuxt",
    "@artmizu/nuxt-prometheus",
  ],

  css: ["~/assets/main.css"],

  colorMode: {
    preference: "system",
    fallback: "dark",
    dataValue: "theme",
    storageKey: "movie-color-mode",
  },

  app: {
    head: {
      htmlAttrs: { lang: "en-US" },
      title: "Movie Tracker",
    },
  },

  runtimeConfig: {
    tmdb: {
      readAccessToken: process.env.NUXT_TMDB_READ_ACCESS_TOKEN || "",
    },
  },
});
