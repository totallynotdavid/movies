<script setup lang="ts">
import { computed } from "vue";
import type { Props } from "./profile.server";
import MediaCard from "../src/components/MediaCard.vue";
import ProfileActivityFeed from "../src/components/profile/ProfileActivityFeed.vue";
import ProfileActivityHeatmap from "../src/components/profile/ProfileActivityHeatmap.vue";
import ProfilePatterns from "../src/components/profile/ProfilePatterns.vue";
import ProfileLedger from "../src/components/profile/ProfileLedger.vue";
import { formatScore } from "../src/domain/rating";
import { tmdbImage } from "../src/components/tmdb-image";

const props = defineProps<Props>();
const wrappedYear = new Date().getUTCFullYear();

const formatStatPanels = computed(() => [
  {
    key: "movie",
    label: "Movies",
    stats: props.formatStats.movie,
  },
  {
    key: "show",
    label: "Shows",
    stats: props.formatStats.show,
  },
]);
</script>

<template>
  <div class="flex flex-col gap-10">
    <section class="flex items-center gap-5 motion-safe:animate-slide-up animate-fill-both">
      <div
        class="w-16 h-16 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <span class="font-mono text-xl text-accent uppercase">{{ user.name[0] }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-mono font-bold">{{ user.name }}</h1>
        <p class="text-fg-muted text-sm font-mono">{{ user.email }}</p>
      </div>
    </section>

    <section
      class="flex flex-col gap-3 border-y border-border py-4 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.025s"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-1">
          <h2 class="text-sm font-mono text-fg-muted">{{ wrappedYear }} wrapped</h2>
          <p class="text-sm text-fg-subtle">
            See the time, genres, and people behind what you watched most this year.
          </p>
        </div>
        <a
          href="/wrapped"
          class="inline-flex items-center gap-2 self-start rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-mono text-fg transition-colors hover:bg-accent/15"
        >
          <span class="i-lucide:sparkles h-4 w-4" aria-hidden="true" />
          open wrapped
        </a>
      </div>
    </section>

    <section
      class="grid gap-4 md:grid-cols-2 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.05s"
    >
      <div
        v-for="panel in formatStatPanels"
        :key="panel.key"
        class="flex flex-col gap-4 rounded-xl border border-border bg-bg-subtle p-5"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-mono text-fg-muted">{{ panel.label }}</h2>
          <span
            class="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[0.65rem] font-mono text-fg-subtle"
          >
            {{ panel.stats.tracked }} tracked
          </span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-lg font-mono font-bold">{{ panel.stats.tracked }}</span>
            <span class="text-[0.7rem] font-mono text-fg-subtle">tracked</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-lg font-mono font-bold">{{ panel.stats.watchDays }}</span>
            <span class="text-[0.7rem] font-mono text-fg-subtle">watch days</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-lg font-mono font-bold">
              {{ formatScore(panel.stats.averageScore100, props.ratingSystem) }}
            </span>
            <span class="text-[0.7rem] font-mono text-fg-subtle">average score</span>
          </div>
        </div>
      </div>
    </section>

    <section
      class="flex flex-col gap-4 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.1s"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">activity</h2>
        <span class="text-[0.7rem] font-mono text-fg-subtle">last 365 days</span>
      </div>
      <ProfileActivityHeatmap :days="activityCalendar" />
    </section>

    <ProfilePatterns
      :weekday="mirror.weekday"
      :day-part="mirror.dayPart"
      :genre-timing="mirror.genreTiming"
      :phase="mirror.phase"
    />

    <ProfileLedger :ledger="mirror.ledger" />

    <section
      class="flex flex-col gap-4 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.15s"
    >
      <h2 class="text-sm font-mono text-fg-muted">recent activity</h2>
      <ProfileActivityFeed :items="recentActivity" />
    </section>

    <section
      v-if="favoriteMedia.length > 0"
      class="flex flex-col gap-4 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.2s"
    >
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

    <section
      v-if="favoritePeople.length > 0"
      class="flex flex-col gap-4 motion-safe:animate-slide-up animate-fill-both"
      style="animation-delay: 0.25s"
    >
      <h2 class="text-sm font-mono text-fg-muted">favorite people</h2>
      <div class="flex flex-wrap gap-3">
        <a
          v-for="person in favoritePeople"
          :key="person.personId"
          :href="`/person/${person.slug}`"
          class="group flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-bg-subtle hover:border-border-hover transition-colors"
        >
          <img
            v-if="person.profilePath"
            :src="tmdbImage(person.profilePath, 'w185')"
            :alt="person.name"
            class="w-8 h-8 rounded-full object-cover"
            loading="lazy"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center"
            aria-hidden="true"
          >
            <span class="i-lucide:user w-4 h-4 text-fg-subtle" />
          </div>
          <span class="text-sm font-mono text-fg group-hover:text-accent transition-colors">
            {{ person.name }}
          </span>
        </a>
      </div>
    </section>
  </div>
</template>
