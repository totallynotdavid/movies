<script setup lang="ts">
const TMDB_POSTER = "https://image.tmdb.org/t/p/w342";

defineProps<{
  title: string;
  subtitle?: string | null;
  year?: string | null;
  posterPath?: string | null;
  mediaType?: "movie" | "show";
  slug?: string | null;
}>();
</script>

<template>
  <component
    :is="slug ? 'a' : 'div'"
    :href="slug ? `/media/${slug}` : undefined"
    class="group flex flex-col gap-2"
  >
    <div class="poster-wrap rounded-lg overflow-hidden bg-bg-elevated">
      <img
        v-if="posterPath"
        :src="`${TMDB_POSTER}${posterPath}`"
        :alt="title"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center p-2 text-center text-fg-subtle text-xs font-mono"
      >
        {{ title }}
      </div>
    </div>
    <div class="flex flex-col gap-0.5 min-w-0">
      <span
        class="font-mono text-xs leading-snug line-clamp-2"
        :class="slug ? 'text-fg group-hover:text-accent transition-colors' : 'text-fg'"
      >
        {{ title }}
      </span>
      <span v-if="subtitle" class="font-mono text-[0.7rem] text-fg-muted leading-snug line-clamp-1">
        {{ subtitle }}
      </span>
      <span v-if="year" class="font-mono text-[0.65rem] text-fg-subtle">{{ year }}</span>
    </div>
  </component>
</template>
