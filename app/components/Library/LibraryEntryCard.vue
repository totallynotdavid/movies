<script setup lang="ts">
import type { LibraryEntry } from '#shared/types/tracking'

defineProps<{ entry: LibraryEntry }>()
</script>

<template>
  <BaseCard>
    <div class="flex-split gap-4">
      <div>
        <p class="font-mono text-sm">{{ entry.title }}</p>
        <p class="text-fg-muted text-xs">{{ entry.status }}</p>
      </div>
      <TagStatic>{{ entry.mediaType }}</TagStatic>
    </div>
  </BaseCard>
</template>
