<script setup lang="ts">
import type { Props } from "./cast.server";
import MediaTabs from "@/components/media/MediaTabs.vue";
import PersonChip from "@/components/PersonChip.vue";

const props = defineProps<Props>();

function caption(episodeCount: number | null): string | null {
  if (props.media.mediaType !== "show" || !episodeCount) return null;
  return `${episodeCount} episode${episodeCount > 1 ? "s" : ""}`;
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-mono font-bold">
        <a :href="`/media/${media.slug}`" class="hover:text-accent transition-colors">
          {{ media.title }}
        </a>
      </h1>
      <MediaTabs :slug="media.slug" active="cast" />
    </div>

    <section v-if="cast.length" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">cast · {{ cast.length }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <PersonChip
          v-for="member in cast"
          :key="member.id"
          :name="member.name"
          :slug="member.slug"
          :profile-path="member.profilePath"
          :subtitle="member.character"
          :caption="caption(member.episodeCount)"
        />
      </div>
    </section>

    <p v-else class="font-mono text-sm text-fg-muted">no cast recorded for this title.</p>
  </div>
</template>
