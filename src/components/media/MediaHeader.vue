<script setup lang="ts">
import { computed } from "vue";
import { Link } from "@void/vue";
import type { MediaSummary } from "@/shared/catalog";
import { episodeSummary, runtimeText, scoreText, votesText, yearOf } from "@/shared/format-media";
import { mediaStatusLabel } from "@/shared/media-status";
import { tmdbImage } from "@/components/tmdb-image";

const props = defineProps<{
  media: MediaSummary;
  page: "overview" | "cast" | "crew" | "timeline";
}>();

const links = computed(() => [
  { page: "overview", label: "overview", href: `/media/${props.media.slug}` },
  { page: "cast", label: "cast", href: `/media/${props.media.slug}/cast` },
  { page: "crew", label: "crew", href: `/media/${props.media.slug}/crew` },
  { page: "timeline", label: "timeline", href: `/media/${props.media.slug}/timeline` },
]);

const isShow = computed(() => props.media.mediaType === "show");
const score = computed(() => scoreText(props.media.voteAverage));
const statusLabel = computed(() => mediaStatusLabel(props.media.status));
const meta = computed(() =>
  [
    yearOf(props.media.releaseDate),
    isShow.value
      ? (episodeSummary(props.media.seasonCount, props.media.episodeCount) ??
        runtimeText(props.media.runtime))
      : runtimeText(props.media.runtime),
    votesText(props.media.voteCount),
  ].filter(Boolean),
);
</script>

<template>
  <header class="bg-bg pt-5 pb-1 w-full container">
    <div class="flex items-start justify-between gap-x-4 gap-y-3 flex-wrap min-w-0">
      <div class="flex min-w-0 items-start gap-4">
        <div
          class="poster-wrap shrink-0 w-16 sm:w-24 rounded-md overflow-hidden border border-border bg-bg-elevated"
        >
          <img
            v-if="media.posterPath"
            :src="tmdbImage(media.posterPath, 'w185')"
            :alt="`${media.title} poster`"
            loading="eager"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-fg-subtle text-[0.625rem] font-mono"
          >
            no poster
          </div>
        </div>

        <div class="flex flex-col items-start min-w-0 gap-2">
          <h1
            class="font-mono text-lg sm:text-3xl font-medium min-w-0 break-words"
            :title="media.title"
          >
            <Link
              v-if="page !== 'overview'"
              :href="`/media/${media.slug}`"
              class="hover:text-accent"
            >
              {{ media.title }}
            </Link>
            <span v-else>{{ media.title }}</span>
          </h1>

          <div
            v-if="meta.length"
            class="flex flex-wrap items-center gap-2 font-mono text-xs text-fg-muted"
          >
            <template v-for="(item, index) in meta" :key="item">
              <span v-if="index > 0" class="text-fg-subtle" aria-hidden="true">·</span>
              <span>{{ item }}</span>
            </template>
          </div>

          <p v-if="media.tagline" class="text-fg-muted text-sm italic font-mono">
            {{ media.tagline }}
          </p>

          <p
            v-if="media.overview"
            class="text-fg-muted text-sm leading-relaxed max-w-3xl media-summary"
          >
            {{ media.overview }}
          </p>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap items-stretch">
        <span
          v-if="score"
          class="inline-flex items-center gap-1 rounded-md border border-border bg-transparent px-2.5 py-1 font-mono text-xs text-fg-muted"
        >
          <span class="i-lucide:star size-3.5 text-accent" aria-hidden="true" />
          {{ score }}
        </span>
        <span
          v-if="statusLabel"
          class="inline-flex items-center rounded-md border border-border bg-transparent px-2.5 py-1 font-mono text-xs text-fg-muted"
        >
          {{ statusLabel }}
        </span>
        <span
          class="inline-flex items-center rounded-md border border-border bg-bg-subtle px-2.5 py-1 font-mono text-xs text-fg-muted"
        >
          {{ media.mediaType }}
        </span>
      </div>
    </div>
  </header>

  <div class="w-full bg-bg z-40 border-b border-border pt-2" data-testid="media-subheader">
    <div
      class="w-full container flex flex-col md:flex-row-reverse items-baseline justify-between gap-x-2 gap-y-1 flex-wrap"
    >
      <div v-if="$slots.actions" class="flex items-center max-md:w-full max-md:justify-end gap-2">
        <slot name="actions" />
      </div>

      <nav
        aria-label="title navigation"
        class="flex gap-4 me-auto -mb-px max-w-full overflow-x-auto media-nav"
      >
        <Link
          v-for="link in links"
          :key="link.page"
          :href="link.href"
          :aria-current="page === link.page ? 'page' : undefined"
          class="decoration-none border-b-2 p-1 hover:border-accent/50 lowercase focus-visible:[outline-offset:-2px]!"
          :class="page === link.page ? 'border-accent text-accent!' : 'border-transparent'"
        >
          {{ link.label }}
        </Link>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.media-nav {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.media-nav::-webkit-scrollbar {
  display: none;
}

.media-summary {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
