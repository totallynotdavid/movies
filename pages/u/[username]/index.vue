<script setup lang="ts">
import type { Props } from "./index.server";
import ProfileCard from "@/components/profile/ProfileCard.vue";
import ProfileOwnerControls from "@/components/profile/ProfileOwnerControls.vue";
import InsightsDashboard from "@/components/insights/Dashboard.vue";
import YearNav from "@/components/wrapped/YearNav.vue";

const props = defineProps<Props>();
</script>

<template>
  <main class="container py-8 sm:py-12">
    <div class="flex flex-col gap-10">
      <ProfileCard :card="props.card">
        <template #header-aside>
          <ProfileOwnerControls v-if="props.viewer.owner" :is-private="props.isPrivate" />
          <YearNav :username="props.card.identity.username" :items="props.recapYears" />
        </template>
      </ProfileCard>

      <InsightsDashboard v-if="props.insights" :insights="props.insights" />
    </div>
  </main>
</template>
