import { voidPlugin } from "void";

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

  vite: {
    // @ts-expect-error voidPlugin() is Plugin<any>[] from vite 8; nuxt's bundled vite 7 types differ
    plugins: [...voidPlugin()],
  },

  nitro: {
    preset: "cloudflare-module",
  },

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
