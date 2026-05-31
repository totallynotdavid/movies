<script setup lang="ts">
import type { Props } from "./wrapped.server";
import Empty from "../src/components/wrapped/Empty.vue";
import Hero from "../src/components/wrapped/Hero.vue";
import TopTitles from "../src/components/wrapped/TopTitles.vue";
import People from "../src/components/wrapped/People.vue";
import Distribution from "../src/components/wrapped/Distribution.vue";

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-12">
    <Empty v-if="wrapped.totalWatchCount === 0" :year="wrapped.year" />

    <template v-else>
      <Hero :wrapped="wrapped" :user-name="user.name" />
      <TopTitles :titles="wrapped.topTitles" :rating-system="ratingSystem" />
      <People
        :actors="wrapped.topActors"
        :directors="wrapped.topDirectors"
        :crew="wrapped.topCrew"
      />
      <Distribution :genres="wrapped.topGenres" :formats="wrapped.formatBreakdown" />
    </template>
  </div>
</template>
