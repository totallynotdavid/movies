<script setup lang="ts">
import type { AvatarColor } from "@/shared/types/identity";
import type { RatingSystem } from "@/domain/rating";
import type {
  ProfileCalendarDay,
  ProfileActivityItem,
  ProfileFormatStats,
} from "@/domain/insights/profile";
import type { MediaRecord } from "@/domain/catalog/media";
import ProfileHeader from "@/components/identity/ProfileHeader.vue";
import ProfileStats from "./ProfileStats.vue";
import FavoriteMedia from "./FavoriteMedia.vue";
import FavoritePeople from "./FavoritePeople.vue";
import ProfileActivityHeatmap from "./ProfileActivityHeatmap.vue";
import ProfileActivityFeed from "./ProfileActivityFeed.vue";

// Shared portrait for /u/{username} and /profile.
// `#recap` customizes the recap entry per surface.
// The default slot appends private-only sections after shared content.
const props = defineProps<{
  displayName: string;
  username: string | null;
  avatarEmoji: string | null;
  avatarColor: AvatarColor | null;
  joinedAt: number;
  ratingSystem: RatingSystem;
  formatStats: ProfileFormatStats;
  activityCalendar: ProfileCalendarDay[];
  recentActivity: ProfileActivityItem[];
  favoriteMedia: { mediaId: string; media: MediaRecord }[];
  favoritePeople: { personId: string; name: string; slug: string; profilePath: string | null }[];
}>();
</script>

<template>
  <div class="flex flex-col gap-10">
    <ProfileHeader
      :display-name="props.displayName"
      :username="props.username"
      :avatar-emoji="props.avatarEmoji"
      :avatar-color="props.avatarColor"
      :joined-at="props.joinedAt"
    />

    <ProfileStats :format-stats="props.formatStats" :rating-system="props.ratingSystem" />

    <slot name="recap" />

    <FavoriteMedia :items="props.favoriteMedia" />
    <FavoritePeople :people="props.favoritePeople" />

    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-mono text-fg-muted">activity</h2>
        <span class="text-[0.7rem] font-mono text-fg-subtle">last 365 days</span>
      </div>
      <ProfileActivityHeatmap :days="props.activityCalendar" />
    </section>
    <slot />

    <section class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">recent activity</h2>
      <ProfileActivityFeed :items="props.recentActivity" />
    </section>
  </div>
</template>
