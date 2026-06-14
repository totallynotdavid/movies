<script setup lang="ts">
import type { Props } from "./crew.server";
import MediaHeader from "@/components/media/MediaHeader.vue";
import PersonChip from "@/components/PersonChip.vue";

defineProps<Props>();
</script>

<template>
  <main class="flex-1 pb-8">
    <MediaHeader :media="media" page="crew" />

    <div class="container flex flex-col gap-8 py-6 sm:py-8 lg:py-12">
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
  </main>
</template>
