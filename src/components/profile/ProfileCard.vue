<script setup lang="ts">
import type { ProfileCardModel } from "@/domain/profile-card";
import ProfileHeader from "@/components/identity/ProfileHeader.vue";
import ProfileSection from "@/components/identity/ProfileSection.vue";
import ProfileStatStrip from "./ProfileStatStrip.vue";
import FavoriteMedia from "./FavoriteMedia.vue";
import FavoritePeople from "./FavoritePeople.vue";
import ProfileActivityHeatmap from "./ProfileActivityHeatmap.vue";
import ProfileActivityFeed from "./ProfileActivityFeed.vue";

const props = defineProps<{ card: ProfileCardModel }>();
</script>

<template>
  <div class="flex flex-col gap-10">
    <ProfileHeader :identity="props.card.identity">
      <template #meta>
        <ProfileStatStrip :stats="props.card.stats" :rating-system="props.card.ratingSystem" />
      </template>
      <template #aside>
        <slot name="header-aside" />
      </template>
    </ProfileHeader>

    <FavoriteMedia :items="props.card.favorites.media" />
    <FavoritePeople :people="props.card.favorites.people" />

    <ProfileSection title="activity">
      <template #aside>
        <span class="text-[0.7rem] font-mono text-fg-subtle">last 365 days</span>
      </template>
      <ProfileActivityHeatmap :days="props.card.activity.calendar" />
    </ProfileSection>

    <ProfileSection title="recent activity">
      <ProfileActivityFeed :items="props.card.activity.recent" />
    </ProfileSection>
  </div>
</template>
