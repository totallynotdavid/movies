<script setup lang="ts">
import { tmdbImage } from "./tmdb-image";

defineProps<{
  name: string;
  profilePath?: string | null;
  subtitle?: string | null;
  caption?: string | null;
  href?: string | null;
}>();
</script>

<template>
  <component :is="href ? 'a' : 'div'" :href="href ?? undefined" class="group flex flex-col gap-2">
    <div class="poster-wrap rounded-lg overflow-hidden bg-bg-elevated">
      <img
        v-if="profilePath"
        :src="tmdbImage(profilePath, 'w185')"
        :alt="name"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-fg-subtle">
        <span class="i-lucide:user w-6 h-6" aria-hidden="true" />
      </div>
    </div>
    <div class="flex flex-col gap-0.5 min-w-0">
      <span
        class="font-mono text-xs text-fg leading-snug line-clamp-2"
        :class="href ? 'group-hover:text-accent transition-colors' : ''"
      >
        {{ name }}
      </span>
      <span v-if="subtitle" class="font-mono text-[0.7rem] text-fg-muted leading-snug line-clamp-2">
        {{ subtitle }}
      </span>
      <span v-if="caption" class="font-mono text-[0.65rem] text-fg-subtle">{{ caption }}</span>
    </div>
  </component>
</template>
