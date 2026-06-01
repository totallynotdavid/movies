<script setup lang="ts">
import type { WrappedSummary } from "@/domain/insights/wrapped";
import type { RatingSystem } from "@/domain/rating";
import Empty from "./Empty.vue";
import Hero from "./Hero.vue";
import TopTitles from "./TopTitles.vue";
import People from "./People.vue";
import Distribution from "./Distribution.vue";

// The shared recap body: the same year-in-review for the private live /wrapped
// and the public year snapshot. Rating display is a prop (the owner's system on
// the private page, the fixed score100 on a public profile), and the headline
// name comes from whoever owns the recap.
const props = defineProps<{
  wrapped: WrappedSummary;
  ratingSystem: RatingSystem;
  userName: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-12">
    <Empty v-if="props.wrapped.totalWatchCount === 0" :year="props.wrapped.year" />

    <template v-else>
      <Hero :wrapped="props.wrapped" :user-name="props.userName" />
      <TopTitles :titles="props.wrapped.topTitles" :rating-system="props.ratingSystem" />
      <People
        :actors="props.wrapped.topActors"
        :directors="props.wrapped.topDirectors"
        :crew="props.wrapped.topCrew"
      />
      <Distribution :genres="props.wrapped.topGenres" :formats="props.wrapped.formatBreakdown" />
    </template>
  </div>
</template>
