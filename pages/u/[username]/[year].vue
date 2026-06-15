<script setup lang="ts">
import type { Props } from "./[year].server";
import ProfileHeader from "@/components/identity/ProfileHeader.vue";
import YearNav from "@/components/wrapped/YearNav.vue";
import WrappedBody from "@/components/wrapped/WrappedBody.vue";
import WrappedLocked from "@/components/wrapped/WrappedLocked.vue";

const props = defineProps<Props>();
const ratingSystem = "score100" as const;
</script>

<template>
  <main class="container flex flex-col gap-12 py-8 sm:py-12">
    <ProfileHeader :identity="props.profile" />

    <YearNav :username="props.profile.username" :items="props.recapYears" :year="props.year" />

    <WrappedLocked
      v-if="props.recapAccess === 'locked'"
      :year="props.year"
      :display-name="props.profile.displayName"
    />
    <WrappedBody
      v-else-if="props.wrapped"
      :wrapped="props.wrapped"
      :rating-system="ratingSystem"
      :user-name="props.profile.displayName"
    />
  </main>
</template>
