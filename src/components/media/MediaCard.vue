<script setup lang="ts">
import { computed } from "vue";
import BaseCard from "@/components/ui/BaseCard.vue";
import type { MediaType } from "@/domain/catalog/media";
import { tmdbImage } from "@/components/tmdb-image";

// Poster actions stay outside the link so nested buttons never trigger navigation.
const props = defineProps<{
  title: string;
  mediaType: MediaType;
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
}>();

const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));
const href = computed(() => (props.slug ? `/media/${props.slug}` : undefined));
</script>

<template>
  <BaseCard class="p-0! overflow-hidden">
    <div class="poster-wrap rounded-b-none relative overflow-hidden rounded-t-lg">
      <a :href="href" class="block h-full w-full">
        <img
          v-if="posterPath"
          :src="tmdbImage(posterPath, 'w342')"
          :alt="`${title} poster`"
          loading="lazy"
          decoding="async"
          class="transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div
          v-else
          class="w-full h-full flex items-end p-3 bg-bg-elevated text-fg-subtle text-xs font-mono"
        >
          no poster
        </div>
      </a>

      <!-- Marker slot defaults to media type. Callers may replace it with status or progress. -->
      <div class="absolute top-1.5 left-1.5 z-10">
        <slot name="overlay">
          <span
            class="text-[0.6rem] font-mono lowercase px-1.5 py-0.5 rounded-md border border-border/50 bg-bg/75 backdrop-blur-sm text-fg-muted"
          >
            {{ mediaType }}
          </span>
        </slot>
      </div>

      <div class="absolute bottom-1.5 right-1.5 z-10">
        <slot name="poster-action" />
      </div>
    </div>

    <div class="flex flex-col gap-1.5 p-3">
      <a
        :href="href"
        class="font-mono text-sm text-fg leading-snug line-clamp-2 min-h-[2.5em] hover:text-accent transition-colors"
      >
        {{ title }}
      </a>

      <slot name="meta">
        <div class="flex items-center gap-2 text-xs text-fg-subtle font-mono">
          <span v-if="year">{{ year }}</span>
          <span v-if="year && voteAverage" aria-hidden="true">·</span>
          <span v-if="voteAverage">★ {{ (voteAverage / 2).toFixed(1) }}</span>
        </div>
      </slot>

      <slot name="action" />
    </div>
  </BaseCard>
</template>
