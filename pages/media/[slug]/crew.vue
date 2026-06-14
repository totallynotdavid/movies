<script setup lang="ts">
import type { Props } from "./crew.server";
import MediaTabs from "@/components/media/MediaTabs.vue";
import PersonChip from "@/components/PersonChip.vue";

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-mono font-bold">
        <a :href="`/media/${media.slug}`" class="hover:text-accent transition-colors">
          {{ media.title }}
        </a>
      </h1>
      <MediaTabs :slug="media.slug" active="crew" />
    </div>

    <section v-for="group in crewGroups" :key="group.department" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">
        {{ group.department.toLowerCase() }} · {{ group.members.length }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <PersonChip
          v-for="member in group.members"
          :key="member.id"
          :name="member.name"
          :slug="member.slug"
          :profile-path="member.profilePath"
          :subtitle="member.job"
        />
      </div>
    </section>

    <p v-if="crewGroups.length === 0" class="font-mono text-sm text-fg-muted">
      no crew recorded for this title.
    </p>
  </div>
</template>
