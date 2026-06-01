<script setup lang="ts">
import MediaCard from "@/components/MediaCard.vue";
import type { MediaRecord } from "@/domain/catalog/media";

defineProps<{ items: { mediaId: string; media: MediaRecord }[] }>();
</script>

<template>
  <section v-if="items.length > 0" class="flex flex-col gap-4">
    <h2 class="text-sm font-mono text-fg-muted">favorite media</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <MediaCard
        v-for="fav in items"
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
</template>
