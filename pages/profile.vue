<script setup lang="ts">
import type { Props } from "./profile.server";
import MediaCard from "../src/components/MediaCard.vue";

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Profile header -->
    <section class="flex items-center gap-5">
      <div
        class="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0"
      >
        <span class="font-mono text-xl text-accent uppercase">{{ user.name[0] }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-mono font-bold">{{ user.name }}</h1>
        <p class="text-fg-muted text-sm font-mono">{{ user.email }}</p>
      </div>
    </section>

    <!-- Stats -->
    <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="(value, key) in {
          total: stats.total,
          watching: stats.watching,
          completed: stats.completed,
          planned: stats.planned,
        }"
        :key="key"
        class="flex flex-col gap-1 p-4 rounded-xl border border-border bg-bg-subtle"
      >
        <span class="text-2xl font-mono font-bold">{{ value }}</span>
        <span class="text-xs font-mono text-fg-muted">{{ key }}</span>
      </div>
    </section>

    <!-- Favorite media -->
    <section v-if="favoriteMedia.length > 0" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">favorite media</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MediaCard
          v-for="fav in favoriteMedia"
          :key="fav.mediaId"
          :title="fav.media.title"
          :media-type="fav.media.mediaType"
          :poster-path="fav.media.posterPath"
          :release-date="fav.media.releaseDate"
          :vote-average="fav.media.voteAverage"
          :slug="fav.media.slug"
        />
      </div>
    </section>

    <!-- Favorite actors -->
    <section v-if="favoriteActors.length > 0" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">favorite actors</h2>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="actor in favoriteActors"
          :key="actor.id"
          class="flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-bg-subtle"
        >
          <img
            v-if="actor.actorProfilePath"
            :src="`${TMDB_IMG}${actor.actorProfilePath}`"
            :alt="actor.actorName"
            class="w-8 h-8 rounded-full object-cover"
          />
          <div v-else class="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center">
            <span class="i-lucide:user w-4 h-4 text-fg-subtle" aria-hidden="true" />
          </div>
          <span class="text-sm font-mono text-fg">{{ actor.actorName }}</span>
        </div>
      </div>
    </section>

    <!-- Recent library -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-mono text-fg-muted">library</h2>
        <a
          href="/library"
          class="text-xs font-mono text-accent hover:text-accent/80 transition-colors"
        >
          manage →
        </a>
      </div>

      <div v-if="library.length === 0" class="text-fg-subtle text-sm font-mono py-4">
        nothing tracked yet
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MediaCard
          v-for="entry in library.slice(0, 10)"
          :key="entry.id"
          :title="entry.media.title"
          :media-type="entry.media.mediaType"
          :poster-path="entry.media.posterPath"
          :release-date="entry.media.releaseDate"
          :vote-average="entry.media.voteAverage"
          :slug="entry.media.slug"
          :status="entry.status"
        />
      </div>
    </section>
  </div>
</template>
