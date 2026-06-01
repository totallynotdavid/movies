<script setup lang="ts">
import { tmdbImage } from "@/components/tmdb-image";

defineProps<{
  people: { personId: string; name: string; slug: string; profilePath: string | null }[];
}>();
</script>

<template>
  <section v-if="people.length > 0" class="flex flex-col gap-4">
    <h2 class="text-sm font-mono text-fg-muted">favorite people</h2>
    <div class="flex flex-wrap gap-3">
      <a
        v-for="person in people"
        :key="person.personId"
        :href="`/person/${person.slug}`"
        class="group flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-bg-subtle hover:border-border-hover transition-colors"
      >
        <img
          v-if="person.profilePath"
          :src="tmdbImage(person.profilePath, 'w185')"
          :alt="person.name"
          class="w-8 h-8 rounded-full object-cover"
          loading="lazy"
        />
        <div
          v-else
          class="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center"
          aria-hidden="true"
        >
          <span class="i-lucide:user w-4 h-4 text-fg-subtle" />
        </div>
        <span class="text-sm font-mono text-fg group-hover:text-accent transition-colors">
          {{ person.name }}
        </span>
      </a>
    </div>
  </section>
</template>
