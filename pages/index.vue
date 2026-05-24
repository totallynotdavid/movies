<script setup lang="ts">
import { computed } from "vue";
import type { Props } from "./index.server";
import MediaCard from "../src/components/MediaCard.vue";

const props = defineProps<Props>();

const movies = computed(() => props.entries.filter((e) => e.mediaType === "movie"));
const shows = computed(() => props.entries.filter((e) => e.mediaType === "show"));
</script>

<template>
  <div class="flex flex-col gap-16">
    <!-- Hero -->
    <section class="flex flex-col gap-5 pt-4 sm:pt-8">
      <div class="flex items-center gap-3">
        <span
          class="text-xs font-mono px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent"
        >
          {{ movies.length }} movies
        </span>
        <span
          class="text-xs font-mono px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-fg-muted"
        >
          {{ shows.length }} shows
        </span>
      </div>

      <h1 class="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-fg">
        your watch<br />
        <span class="text-accent">history</span>
      </h1>

      <p class="text-fg-muted max-w-md text-base">
        search titles, track what you're watching, and keep a personal history of everything you've
        seen.
      </p>

      <div class="flex flex-wrap gap-3 pt-1">
        <a
          href="/library"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/40 bg-accent/10 text-fg text-sm font-mono hover:bg-accent/15 transition-colors"
        >
          <span class="i-lucide:library w-4 h-4" aria-hidden="true" />
          open library
        </a>
        <a
          href="/login"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-subtle text-fg-muted text-sm font-mono hover:border-border-hover hover:text-fg transition-colors"
        >
          <span class="i-lucide:log-in w-4 h-4" aria-hidden="true" />
          sign in
        </a>
      </div>
    </section>

    <!-- Catalog grid -->
    <section v-if="entries.length > 0" class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-mono text-fg-muted">catalog</h2>
        <span class="text-xs font-mono text-fg-subtle">{{ entries.length }} titles</span>
      </div>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        <MediaCard
          v-for="entry in entries"
          :key="entry.id"
          :title="entry.title"
          :media-type="entry.mediaType"
          :poster-path="entry.posterPath"
          :release-date="entry.releaseDate"
          :vote-average="entry.voteAverage"
          :slug="entry.slug"
        />
      </div>
    </section>

    <section v-else class="flex flex-col items-center gap-4 py-16 text-center">
      <span class="i-lucide:film w-12 h-12 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted">no titles yet</p>
      <p class="text-sm text-fg-subtle">seed the database to populate the catalog.</p>
    </section>
  </div>
</template>
