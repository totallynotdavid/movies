<script setup lang="ts">
import { tmdbImage } from "@/components/tmdb-image";

defineProps<{
  name: string;
  slug: string;
  profilePath?: string | null;
  subtitle?: string | null;
  caption?: string | null;
}>();
</script>

<template>
  <a
    :href="`/person/${slug}`"
    class="group flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-bg-subtle hover:border-border-hover hover:bg-bg-muted transition-colors focus-ring"
  >
    <img
      v-if="profilePath"
      :src="tmdbImage(profilePath, 'w185')"
      :alt="name"
      class="w-10 h-10 rounded-full object-cover shrink-0"
      loading="lazy"
      decoding="async"
    />
    <div
      v-else
      class="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <span class="i-lucide:user w-4 h-4 text-fg-subtle" />
    </div>
    <div class="flex flex-col min-w-0">
      <span class="text-sm font-mono text-fg group-hover:text-accent transition-colors truncate">
        {{ name }}
      </span>
      <span v-if="subtitle" class="text-xs font-mono text-fg-muted truncate">{{ subtitle }}</span>
      <span v-if="caption" class="text-[0.7rem] font-mono text-fg-subtle truncate">
        {{ caption }}
      </span>
    </div>
  </a>
</template>
