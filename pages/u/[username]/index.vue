<script setup lang="ts">
import type { Props } from "./index.server";
import ProfilePortrait from "@/components/profile/ProfilePortrait.vue";
import YearNav from "@/components/wrapped/YearNav.vue";

const props = defineProps<Props>();

// Public profiles render the owner's stats in a fixed system; the viewer's own
// rating preference does not apply to someone else's profile.
const ratingSystem = "score100" as const;
</script>

<template>
  <ProfilePortrait
    :display-name="props.profile.displayName"
    :username="props.profile.username"
    :avatar-emoji="props.profile.avatarEmoji"
    :avatar-color="props.profile.avatarColor"
    :joined-at="props.profile.joinedAt"
    :rating-system="ratingSystem"
    :format-stats="props.formatStats"
    :activity-calendar="props.activityCalendar"
    :recent-activity="props.recentActivity"
    :favorite-media="props.favoriteMedia"
    :favorite-people="props.favoritePeople"
  >
    <template #recap>
      <section v-if="props.years.length > 0" class="flex flex-col gap-3">
        <h2 class="text-sm font-mono text-fg-muted">year in review</h2>
        <YearNav
          :username="props.profile.username"
          :years="props.years"
          :locked-year="props.lockedYear"
        />
      </section>
    </template>
  </ProfilePortrait>
</template>
