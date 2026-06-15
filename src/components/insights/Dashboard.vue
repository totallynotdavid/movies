<script setup lang="ts">
import type { Mirror } from "@/domain/insights/mirror";
import Patterns from "./Patterns.vue";
import Ledger from "./Ledger.vue";

const props = defineProps<{ insights: Mirror }>();
</script>

<template>
  <div class="flex flex-col gap-10">
    <Patterns
      :weekday="props.insights.weekday"
      :day-part="props.insights.dayPart"
      :genre-timing="props.insights.genreTiming"
      :phase="props.insights.phase"
    />
    <Ledger :ledger="props.insights.ledger" />
  </div>
</template>
