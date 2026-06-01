<script setup lang="ts">
import type { Props } from "./profile.server";
import ProfilePortrait from "@/components/profile/ProfilePortrait.vue";
import ProfilePatterns from "@/components/profile/ProfilePatterns.vue";
import ProfileLedger from "@/components/profile/ProfileLedger.vue";

const props = defineProps<Props>();
</script>

<template>
  <ProfilePortrait
    :display-name="props.profile.displayName"
    :username="props.profile.username"
    :avatar-emoji="props.profile.avatarEmoji"
    :avatar-color="props.profile.avatarColor"
    :joined-at="props.profile.joinedAt"
    :rating-system="props.profile.ratingSystem"
    :format-stats="props.formatStats"
    :activity-calendar="props.activityCalendar"
    :recent-activity="props.recentActivity"
    :favorite-media="props.favoriteMedia"
    :favorite-people="props.favoritePeople"
  >
    <ProfilePatterns
      :weekday="props.mirror.weekday"
      :day-part="props.mirror.dayPart"
      :genre-timing="props.mirror.genreTiming"
      :phase="props.mirror.phase"
    />
    <ProfileLedger :ledger="props.mirror.ledger" />
  </ProfilePortrait>
</template>
