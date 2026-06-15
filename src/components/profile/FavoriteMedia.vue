<script setup lang="ts">
import MediaCard from "@/components/media/MediaCard.vue";
import ProfileSection from "@/components/identity/ProfileSection.vue";
import type { MediaRecord } from "@/domain/catalog/media";

defineProps<{ items: { mediaId: string; media: MediaRecord }[] }>();
</script>

<template>
  <ProfileSection v-if="items.length > 0" title="favorite media">
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
  </ProfileSection>
</template>
