<script setup lang="ts">
import type { Props } from "./cast.server";
import MediaHeader from "@/components/media/MediaHeader.vue";
import PersonChip from "@/components/PersonChip.vue";

const props = defineProps<Props>();

function caption(episodeCount: number | null): string | null {
  if (props.media.mediaType !== "show" || !episodeCount) return null;
  return `${episodeCount} episode${episodeCount > 1 ? "s" : ""}`;
}
</script>

<template>
  <main class="flex-1 pb-8">
    <MediaHeader :media="media" page="cast" />

    <section v-if="cast.length" class="container flex flex-col gap-4 py-6 sm:py-8 lg:py-12">
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

    <p v-else class="container py-6 sm:py-8 lg:py-12 font-mono text-sm text-fg-muted">
      no cast recorded for this title.
    </p>
  </main>
</template>
