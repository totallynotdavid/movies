<script setup lang="ts">
import { computed } from "vue";
import type { Props } from "./index.server";
import MediaCard from "@/components/media/MediaCard.vue";
import MediaCollection from "@/components/media/MediaCollection.vue";
import ContinueCard from "@/components/media/ContinueCard.vue";
import LibraryBrowser from "@/components/media/LibraryBrowser.vue";

const props = defineProps<Props>();

// Continue watching is the in-progress slice shown first on a member's home.
const CONTINUE_LIMIT = 12;
const continueWatching = computed(() =>
  props.entries.filter((e) => e.status === "watching").slice(0, CONTINUE_LIMIT),
);

const movies = computed(() => props.catalog.filter((e) => e.mediaType === "movie"));
const shows = computed(() => props.catalog.filter((e) => e.mediaType === "show"));
</script>

<template>
  <div v-if="props.user" class="flex flex-col gap-12">
    <section
      v-if="continueWatching.length"
      class="flex flex-col gap-5 motion-safe:animate-slide-up animate-fill-both"
    >
      <h2 class="text-base font-mono text-fg">continue watching</h2>
      <MediaCollection layout="grid">
        <ContinueCard
          v-for="item in continueWatching"
          :key="item.id"
          :media-id="item.media.id"
          :title="item.media.title"
          :slug="item.media.slug"
          :media-type="item.media.mediaType"
          :poster-path="item.media.posterPath"
          :release-date="item.media.releaseDate"
          :vote-average="item.media.voteAverage"
          :watched-episode-count="item.watchedEpisodeCount"
          :aired-episode-count="item.airedEpisodeCount"
        />
      </MediaCollection>
    </section>

    <section
      v-if="props.entries.length === 0"
      class="flex flex-col items-center gap-3 py-12 text-center motion-safe:animate-slide-up animate-fill-both"
    >
      <span class="i-lucide:clapperboard w-12 h-12 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted">nothing tracked yet</p>
      <p class="text-sm text-fg-subtle">
        press <kbd class="font-mono">⌘K</kbd> to search a title and log your first watch
      </p>
    </section>

    <LibraryBrowser
      v-else
      class="motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.05s"
      :entries="props.entries"
      :rating-system="props.ratingSystem"
    />
  </div>

  <div v-else class="flex flex-col gap-16">
    <section
      class="flex flex-col gap-5 pt-4 sm:pt-8 motion-safe:animate-slide-up animate-fill-both"
    >
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

      <a
        href="/login"
        class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/40 bg-accent/10 text-fg text-sm font-mono hover:bg-accent/15 transition-colors focus-ring"
      >
        <span class="i-lucide:log-in w-4 h-4" aria-hidden="true" />
        sign in to track
      </a>
    </section>

    <section
      v-if="catalog.length > 0"
      class="flex flex-col gap-6 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.1s"
    >
      <div class="flex-split">
        <h2 class="text-base font-mono text-fg-muted">catalog</h2>
        <span class="text-xs font-mono text-fg-subtle">{{ catalog.length }} titles</span>
      </div>

      <MediaCollection layout="grid">
        <MediaCard
          v-for="item in catalog"
          :key="item.id"
          :title="item.title"
          :media-type="item.mediaType"
          :poster-path="item.posterPath"
          :release-date="item.releaseDate"
          :vote-average="item.voteAverage"
          :slug="item.slug"
        />
      </MediaCollection>
    </section>

    <section v-else class="flex flex-col items-center gap-4 py-16 text-center">
      <span class="i-lucide:film w-12 h-12 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted">no titles yet</p>
      <p class="text-sm text-fg-subtle">seed the database to populate the catalog.</p>
    </section>
  </div>
</template>
