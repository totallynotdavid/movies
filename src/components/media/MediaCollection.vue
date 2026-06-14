<script setup lang="ts">
import type { MediaLayout } from "@/composables/useLayoutPreference";

// Keeps grid and list containers width-stable across home and search.
defineProps<{ layout: MediaLayout }>();
</script>

<template>
  <div
    :class="
      layout === 'grid'
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
        : 'flex flex-col gap-0.5'
    "
  >
    <slot />
  </div>
</template>
