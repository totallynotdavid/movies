<script setup lang="ts">
import type { AvatarColor } from "@/shared/types/identity";
import type { RatingSystem } from "@/domain/rating";
import type {
  ProfileCalendarDay,
  ProfileActivityItem,
  ProfileFormatStats,
} from "@/domain/insights/profile";
import type { Mirror } from "@/domain/insights/mirror";
import type { MediaRecord } from "@/domain/catalog/media";
import ProfileHeader from "@/components/identity/ProfileHeader.vue";
import ProfileSection from "./ProfileSection.vue";
import ProfileStats from "./ProfileStats.vue";
import ProfilePatterns from "./ProfilePatterns.vue";
import ProfileLedger from "./ProfileLedger.vue";
import FavoriteMedia from "./FavoriteMedia.vue";
import FavoritePeople from "./FavoritePeople.vue";
import ProfileActivityHeatmap from "./ProfileActivityHeatmap.vue";
import ProfileActivityFeed from "./ProfileActivityFeed.vue";

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
  owner: boolean;
  isPrivate: boolean;
  mirror: Mirror | null;
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

    <div v-if="props.owner" class="-mt-6 flex items-center gap-3 text-xs font-mono">
      <span
        v-if="props.isPrivate"
        class="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-fg-muted"
      >
        <span class="i-lucide:lock w-3 h-3" aria-hidden="true" />
        private · only you can see this
      </span>
      <span
        v-else
        class="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent"
      >
        <span class="i-lucide:globe w-3 h-3" aria-hidden="true" />
        public
      </span>
      <a
        href="/settings"
        class="ml-auto text-fg-subtle hover:text-accent transition-colors focus-ring rounded"
      >
        edit profile →
      </a>
    </div>

    <ProfileStats :format-stats="props.formatStats" :rating-system="props.ratingSystem" />

    <slot name="recap" />

    <FavoriteMedia :items="props.favoriteMedia" />
    <FavoritePeople :people="props.favoritePeople" />

    <ProfileSection title="activity">
      <template #aside>
        <span class="text-[0.7rem] font-mono text-fg-subtle">last 365 days</span>
      </template>
      <ProfileActivityHeatmap :days="props.activityCalendar" />
    </ProfileSection>

    <template v-if="props.owner && props.mirror">
      <ProfilePatterns
        :weekday="props.mirror.weekday"
        :day-part="props.mirror.dayPart"
        :genre-timing="props.mirror.genreTiming"
        :phase="props.mirror.phase"
      />
      <ProfileLedger :ledger="props.mirror.ledger" />
    </template>

    <ProfileSection title="recent activity">
      <ProfileActivityFeed :items="props.recentActivity" />
    </ProfileSection>
  </div>
</template>
