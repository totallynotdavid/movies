<script setup lang="ts">
import { computed } from "vue";
import type { Props } from "./wrapped.server";
import { formatScore } from "../src/domain/rating";

const TMDB_POSTER = "https://image.tmdb.org/t/p/w342";
const TMDB_PROFILE = "https://image.tmdb.org/t/p/w185";

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const props = defineProps<Props>();

const topTitle = computed(() => props.wrapped.topTitles[0] ?? null);
const topGenre = computed(() => props.wrapped.topGenres[0] ?? null);

const headline = computed(() => {
  if (!topTitle.value) {
    return `${props.user.name}, here is your ${props.wrapped.year} watch story so far.`;
  }

  return `${props.user.name}, ${topTitle.value.title} led your ${props.wrapped.year} watch story.`;
});

const dek = computed(() => {
  const hours = formatHours(props.wrapped.totalMinutes);
  const parts = [`You logged ${hours} across ${props.wrapped.watchDays} watch days.`];

  if (topGenre.value) {
    parts.push(`${topGenre.value.name} kept pulling you back in.`);
  }

  return parts.join(" ");
});

const summaryCards = computed(() => [
  {
    key: "minutes",
    label: "minutes watched",
    value: numberFormatter.format(Math.round(props.wrapped.totalMinutes)),
    detail: `${formatHours(props.wrapped.totalMinutes)} total time`,
    icon: "i-lucide:clock-3",
  },
  {
    key: "days",
    label: "watch days",
    value: numberFormatter.format(props.wrapped.watchDays),
    detail: `${props.wrapped.totalWatchCount} logged sessions`,
    icon: "i-lucide:calendar-days",
  },
  {
    key: "streak",
    label: "longest streak",
    value: `${props.wrapped.longestStreak}`,
    detail: props.wrapped.longestStreak === 1 ? "one day in a row" : "days in a row",
    icon: "i-lucide:flame",
  },
  {
    key: "busiest",
    label: "busiest day",
    value: props.wrapped.busiestDay ? formatDay(props.wrapped.busiestDay.date) : "n/a",
    detail: props.wrapped.busiestDay
      ? formatMetric(props.wrapped.busiestDay.minutes, props.wrapped.busiestDay.watchCount)
      : "log more watches to find it",
    icon: "i-lucide:sparkles",
  },
]);

const peopleSections = computed(() => [
  {
    key: "actors",
    label: "actors",
    copy: "the faces you kept running into",
    items: props.wrapped.topActors,
  },
  {
    key: "directors",
    label: "directors + creators",
    copy: "the voices steering your year",
    items: props.wrapped.topDirectors,
  },
  {
    key: "crew",
    label: "crew",
    copy: "the names behind the scenes",
    items: props.wrapped.topCrew,
  },
]);

function formatHours(minutes: number) {
  if (minutes === 0) return "0h";
  const hours = minutes / 60;
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${hours.toFixed(1)}h`;
}

function formatMetric(minutes: number, watchCount: number) {
  if (minutes > 0) {
    return `${formatHours(minutes)} watched`;
  }

  return watchCount === 1 ? "1 watch" : `${watchCount} watches`;
}

function formatDay(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function formatShare(share: number) {
  return `${Math.round(share * 100)}%`;
}

function barStyle(share: number) {
  if (share <= 0) return { width: "0%" };
  return { width: `${Math.max(12, Math.round(share * 100))}%` };
}

function personMeta(subtitle: string | null, titleCount: number) {
  const titles = titleCount === 1 ? "1 title" : `${titleCount} titles`;
  return subtitle ? `${subtitle} · ${titles}` : titles;
}
</script>

<template>
  <div class="flex flex-col gap-12">
    <section
      v-if="wrapped.totalWatchCount === 0"
      class="flex flex-col gap-6 border-b border-border pb-10"
    >
      <div class="flex items-center gap-3 text-xs font-mono text-fg-muted">
        <span class="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
          {{ wrapped.year }} wrapped
        </span>
        <span>year to date</span>
      </div>

      <div class="flex flex-col gap-3 max-w-2xl">
        <h1 class="text-4xl sm:text-5xl font-mono font-bold">Your recap starts with one watch</h1>
        <p class="text-base text-fg-muted leading-relaxed">
          Log a movie or an episode from your library and this page will start tracking the people,
          genres, and time behind your year.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <a
          href="/library"
          class="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-mono text-fg transition-colors hover:bg-accent/15"
        >
          <span class="i-lucide:library w-4 h-4" aria-hidden="true" />
          go to library
        </a>
        <a
          href="/profile"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-4 py-2 text-sm font-mono text-fg-muted transition-colors hover:border-border-hover hover:text-fg"
        >
          <span class="i-lucide:user w-4 h-4" aria-hidden="true" />
          profile
        </a>
      </div>
    </section>

    <template v-else>
      <section
        class="grid gap-8 border-b border-border pb-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
      >
        <div class="flex flex-col gap-5">
          <div class="flex flex-wrap items-center gap-3 text-xs font-mono text-fg-muted">
            <span class="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
              {{ wrapped.year }} wrapped
            </span>
            <span>year to date</span>
          </div>

          <div class="flex flex-col gap-3 max-w-2xl">
            <h1 class="text-4xl sm:text-5xl font-mono font-bold">{{ headline }}</h1>
            <p class="text-base text-fg-muted leading-relaxed">
              {{ dek }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3 text-sm font-mono text-fg-subtle">
            <span v-if="topTitle">top title: {{ topTitle.title }}</span>
            <span v-if="topTitle && topGenre" aria-hidden="true">·</span>
            <span v-if="topGenre">top genre: {{ topGenre.name.toLowerCase() }}</span>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="card in summaryCards"
            :key="card.key"
            class="flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="text-[0.7rem] font-mono text-fg-muted">{{ card.label }}</span>
              <span :class="card.icon" class="h-4 w-4 text-fg-subtle" aria-hidden="true" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-2xl font-mono font-bold text-fg">{{ card.value }}</span>
              <span class="text-[0.7rem] font-mono text-fg-subtle">{{ card.detail }}</span>
            </div>
          </article>
        </div>
      </section>

      <section class="flex flex-col gap-6 border-b border-border pb-10">
        <div class="flex flex-col gap-2">
          <h2 class="text-sm font-mono text-fg-muted">most watched</h2>
          <p class="text-sm text-fg-subtle">The titles that absorbed the most time this year.</p>
        </div>

        <div class="grid gap-5 md:grid-cols-3">
          <a
            v-for="(title, index) in wrapped.topTitles"
            :key="title.mediaId"
            :href="`/media/${title.slug}`"
            class="group flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4 transition-colors hover:border-border-hover"
          >
            <div class="poster-wrap rounded-lg">
              <img
                v-if="title.posterPath"
                :src="`${TMDB_POSTER}${title.posterPath}`"
                :alt="`${title.title} poster`"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="flex h-full w-full items-end bg-bg-elevated p-3 text-xs font-mono text-fg-subtle"
              >
                no poster
              </div>
            </div>

            <div
              class="flex items-center justify-between gap-3 text-[0.7rem] font-mono text-fg-subtle"
            >
              <span>#{{ index + 1 }}</span>
              <span>{{ formatMetric(title.minutes, title.watchCount) }}</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-sm font-mono text-fg transition-colors group-hover:text-accent">
                {{ title.title }}
              </span>
              <div
                class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] font-mono text-fg-subtle"
              >
                <span>{{ title.mediaType }}</span>
                <span v-if="title.releaseDate" aria-hidden="true">·</span>
                <span v-if="title.releaseDate">{{ title.releaseDate.slice(0, 4) }}</span>
                <span v-if="title.score100 !== null" aria-hidden="true">·</span>
                <span v-if="title.score100 !== null">
                  rated {{ formatScore(title.score100, ratingSystem) }}
                </span>
              </div>
            </div>
          </a>
        </div>
      </section>

      <section class="flex flex-col gap-6 border-b border-border pb-10">
        <div class="flex flex-col gap-2">
          <h2 class="text-sm font-mono text-fg-muted">the people behind your year</h2>
          <p class="text-sm text-fg-subtle">
            Ranked by how much watch time flowed through each title’s key cast and crew.
          </p>
        </div>

        <div class="grid gap-8 xl:grid-cols-3">
          <div v-for="section in peopleSections" :key="section.key" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <h3 class="text-sm font-mono text-fg">{{ section.label }}</h3>
              <p class="text-[0.7rem] font-mono text-fg-subtle">{{ section.copy }}</p>
            </div>

            <div
              v-if="section.items.length > 0"
              class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
            >
              <div
                v-for="(person, index) in section.items"
                :key="person.personId"
                class="grid grid-cols-[auto_2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
              >
                <span class="text-[0.7rem] font-mono text-fg-subtle">{{ index + 1 }}</span>

                <a
                  :href="`/person/${person.slug}`"
                  class="h-11 w-11 overflow-hidden rounded-lg bg-bg-elevated"
                >
                  <img
                    v-if="person.profilePath"
                    :src="`${TMDB_PROFILE}${person.profilePath}`"
                    :alt="person.name"
                    loading="lazy"
                    decoding="async"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-fg-subtle">
                    <span class="i-lucide:user h-4 w-4" aria-hidden="true" />
                  </div>
                </a>

                <div class="min-w-0 flex flex-col gap-0.5">
                  <a
                    :href="`/person/${person.slug}`"
                    class="truncate text-sm font-mono text-fg transition-colors hover:text-accent"
                  >
                    {{ person.name }}
                  </a>
                  <span class="truncate text-[0.7rem] font-mono text-fg-subtle">
                    {{ personMeta(person.subtitle, person.titleCount) }}
                  </span>
                </div>

                <div class="text-right">
                  <div class="text-sm font-mono text-fg">{{ formatHours(person.minutes) }}</div>
                  <div class="text-[0.65rem] font-mono text-fg-subtle">
                    {{ person.watchCount }} watches
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-lg border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
            >
              No {{ section.label }} ranked yet.
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-10 lg:grid-cols-2">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-sm font-mono text-fg-muted">genres</h2>
            <p class="text-sm text-fg-subtle">What your watch time kept orbiting around.</p>
          </div>

          <div
            v-if="wrapped.topGenres.length > 0"
            class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
          >
            <div
              v-for="genre in wrapped.topGenres"
              :key="genre.name"
              class="flex flex-col gap-2 px-4 py-3"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-mono text-fg">{{ genre.name }}</span>
                <span class="text-[0.7rem] font-mono text-fg-subtle">
                  {{ formatMetric(genre.minutes, genre.watchCount) }}
                </span>
              </div>

              <div class="flex items-center gap-3">
                <div class="h-2 flex-1 rounded-full bg-bg-elevated">
                  <div class="h-full rounded-full bg-accent/80" :style="barStyle(genre.share)" />
                </div>
                <span class="w-10 text-right text-[0.65rem] font-mono text-fg-subtle">
                  {{ formatShare(genre.share) }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
          >
            No genre data yet.
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-sm font-mono text-fg-muted">watch mix</h2>
            <p class="text-sm text-fg-subtle">How your time split between movies and shows.</p>
          </div>

          <div
            class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
          >
            <div
              v-for="format in wrapped.formatBreakdown"
              :key="format.mediaType"
              class="flex flex-col gap-2 px-4 py-4"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-mono text-fg">{{ format.label }}</span>
                <span class="text-[0.7rem] font-mono text-fg-subtle">
                  {{ formatMetric(format.minutes, format.watchCount) }}
                </span>
              </div>

              <div class="flex items-center gap-3">
                <div class="h-2 flex-1 rounded-full bg-bg-elevated">
                  <div class="h-full rounded-full bg-accent/80" :style="barStyle(format.share)" />
                </div>
                <span class="w-10 text-right text-[0.65rem] font-mono text-fg-subtle">
                  {{ formatShare(format.share) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
