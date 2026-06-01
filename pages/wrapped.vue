<script setup lang="ts">
import type { Props } from "./wrapped.server";
import WrappedBody from "@/components/wrapped/WrappedBody.vue";

const props = defineProps<Props>();
</script>

<template>
  <WrappedBody
    :wrapped="props.wrapped"
    :rating-system="props.ratingSystem"
    :user-name="props.user.name"
  />
</template>
