<script setup lang="ts">
import type { Props } from "./credits.server";
import PersonCredit from "../../../src/components/PersonCredit.vue";

const props = defineProps<Props>();

function caption(episodeCount: number | null): string | null {
  if (props.media.mediaType !== "show" || !episodeCount) return null;
  return `${episodeCount} episode${episodeCount > 1 ? "s" : ""}`;
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2">
      <a
        :href="`/media/${media.slug}`"
        class="w-fit text-xs font-mono text-fg-subtle hover:text-accent transition-colors"
      >
        ← {{ media.title }}
      </a>
      <h1 class="text-2xl font-mono font-bold">cast &amp; crew</h1>
    </div>

    <section v-if="cast.length" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">cast · {{ cast.length }}</h2>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-5">
        <PersonCredit
          v-for="c in cast"
          :key="c.id"
          :name="c.name"
          :profile-path="c.profilePath"
          :subtitle="c.character"
          :caption="caption(c.episodeCount)"
          :href="`/person/${c.slug}`"
        />
      </div>
    </section>

    <section v-for="group in crewGroups" :key="group.department" class="flex flex-col gap-3">
      <h2 class="text-sm font-mono text-fg-muted">
        {{ group.department.toLowerCase() }} · {{ group.members.length }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1 text-sm font-mono">
        <div
          v-for="m in group.members"
          :key="m.id"
          class="flex justify-between gap-3 border-b border-border-subtle/40 py-1"
        >
          <a
            :href="`/person/${m.slug}`"
            class="text-fg truncate hover:text-accent transition-colors"
          >
            {{ m.name }}
          </a>
          <span class="shrink-0 text-fg-subtle text-xs text-right">{{ m.job }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
