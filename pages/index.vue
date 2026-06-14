<script setup lang="ts">
import { computed, ref } from "vue";
import type { Props } from "./index.server";
import { useRouter } from "@void/vue";
import MediaCard from "@/components/media/MediaCard.vue";
import MediaCollection from "@/components/media/MediaCollection.vue";
import ContinueCard from "@/components/media/ContinueCard.vue";
import LibraryBrowser from "@/components/media/LibraryBrowser.vue";

const props = defineProps<Props>();
const router = useRouter();

// Continue watching is the in-progress slice shown first on a member's home.
const CONTINUE_LIMIT = 12;
const continueWatching = computed(() =>
  props.entries.filter((e) => e.status === "watching").slice(0, CONTINUE_LIMIT),
);

const homeQuery = ref("");
const popularTitles = computed(() => props.catalog.slice(0, 8));
function goHomeSearch() {
  const q = homeQuery.value.trim();
  void router.visit(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
}
</script>

<template>
  <main v-if="props.user" class="container flex flex-col gap-12 py-8 sm:py-12">
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
  </main>

  <main v-else class="flex-1 flex flex-col">
    <section
      class="relative container min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center text-center pt-20 pb-8 motion-safe:animate-slide-up animate-fill-both"
    >
      <h1 class="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-fg">
        track what you <span class="text-accent">watch</span>
      </h1>

      <p class="mt-4 max-w-md text-base sm:text-lg text-fg-muted">
        search any film or show, log episodes, and keep a personal history of everything you've
        seen.
      </p>

      <div role="search" class="mt-8 w-full max-w-xl">
        <form role="search" class="relative" @submit.prevent="goHomeSearch">
          <div class="search-box group relative flex items-center">
            <kbd
              class="absolute inset-is-4 font-mono text-lg text-fg-subtle pointer-events-none transition-colors duration-200 group-focus-within:text-accent z-1"
              aria-hidden="true"
              >/</kbd
            >
            <input
              v-model="homeQuery"
              type="search"
              name="q"
              placeholder="search titles..."
              aria-label="search titles"
              class="appearance-none w-full bg-bg-subtle border border-border rounded-xl font-mono text-base leading-[1.4] ps-9 pe-28 py-4 text-fg placeholder:text-fg-subtle transition-[border-color,outline-color] duration-300 hover:border-fg-subtle outline-2 outline-transparent outline-offset-2 focus:border-accent focus-visible:outline-accent/70"
            />
            <button
              type="submit"
              class="absolute inset-ie-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 rounded-lg bg-fg px-3.5 py-2 text-sm font-mono text-bg transition-colors hover:bg-fg/50 focus-ring"
            >
              <span class="i-lucide:search w-4 h-4" aria-hidden="true" />
              <span class="sr-only sm:not-sr-only">search</span>
            </button>
          </div>
        </form>
      </div>

      <nav
        v-if="popularTitles.length"
        class="mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2"
        aria-label="popular titles"
      >
        <a
          v-for="item in popularTitles"
          :key="item.id"
          :href="`/media/${item.slug}`"
          class="group inline-flex items-center gap-2 font-mono text-sm text-fg-muted hover:text-fg transition-colors"
        >
          <span
            class="w-1 h-1 rounded-full bg-accent group-hover:bg-fg transition-colors"
            aria-hidden="true"
          />
          {{ item.title }}
        </a>
      </nav>
    </section>

    <section v-if="catalog.length > 0" class="border-t border-border py-24 bg-bg-subtle/10">
      <div
        class="container flex flex-col gap-6 motion-safe:animate-slide-up animate-fill-both"
        style="animation-delay: 0.1s"
      >
        <div class="flex-split">
          <h2 class="text-base font-mono text-fg-muted">browse the catalog</h2>
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
      </div>
    </section>

    <section v-else class="container flex flex-col items-center gap-4 py-16 text-center">
      <span class="i-lucide:film w-12 h-12 text-fg-subtle" aria-hidden="true" />
      <p class="font-mono text-fg-muted">no titles yet</p>
      <p class="text-sm text-fg-subtle">seed the database to populate the catalog.</p>
    </section>
  </main>
</template>
