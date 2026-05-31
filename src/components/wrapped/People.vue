<script setup lang="ts">
import { computed } from "vue";
import type { WrappedPersonStat } from "../../domain/insights/wrapped";
import { tmdbImage } from "../tmdb-image";
import { formatHours } from "./format";

const props = defineProps<{
  actors: WrappedPersonStat[];
  directors: WrappedPersonStat[];
  crew: WrappedPersonStat[];
}>();

const sections = computed(() => [
  { key: "actors", label: "actors", copy: "the faces you kept running into", items: props.actors },
  {
    key: "directors",
    label: "directors + creators",
    copy: "the voices steering your year",
    items: props.directors,
  },
  { key: "crew", label: "crew", copy: "the names behind the scenes", items: props.crew },
]);

function personMeta(subtitle: string | null, titleCount: number) {
  const titles = titleCount === 1 ? "1 title" : `${titleCount} titles`;
  return subtitle ? `${subtitle} · ${titles}` : titles;
}
</script>

<template>
  <section class="flex flex-col gap-6 border-b border-border pb-10">
    <div class="flex flex-col gap-2">
      <h2 class="text-sm font-mono text-fg-muted">the people behind your year</h2>
      <p class="text-sm text-fg-subtle">
        Ranked by how much watch time flowed through each title’s key cast and crew.
      </p>
    </div>

    <div class="grid gap-8 xl:grid-cols-3">
      <div v-for="section in sections" :key="section.key" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h3 class="text-sm font-mono text-fg">{{ section.label }}</h3>
          <p class="text-[0.7rem] font-mono text-fg-subtle">{{ section.copy }}</p>
        </div>

        <div
          v-if="section.items.length > 0"
          class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
        >
          <div
            v-for="(person, index) in section.items"
            :key="person.personId"
            class="grid grid-cols-[auto_2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
          >
            <span class="text-[0.7rem] font-mono text-fg-subtle">{{ index + 1 }}</span>

            <a
              :href="`/person/${person.slug}`"
              class="h-11 w-11 overflow-hidden rounded-lg bg-bg-elevated"
            >
              <img
                v-if="person.profilePath"
                :src="tmdbImage(person.profilePath, 'w185')"
                :alt="person.name"
                loading="lazy"
                decoding="async"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-fg-subtle">
                <span class="i-lucide:user h-4 w-4" aria-hidden="true" />
              </div>
            </a>

            <div class="min-w-0 flex flex-col gap-0.5">
              <a
                :href="`/person/${person.slug}`"
                class="truncate text-sm font-mono text-fg transition-colors hover:text-accent"
              >
                {{ person.name }}
              </a>
              <span class="truncate text-[0.7rem] font-mono text-fg-subtle">
                {{ personMeta(person.subtitle, person.titleCount) }}
              </span>
            </div>

            <div class="text-right">
              <div class="text-sm font-mono text-fg">{{ formatHours(person.minutes) }}</div>
              <div class="text-[0.65rem] font-mono text-fg-subtle">
                {{ person.watchCount }} watches
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-lg border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
        >
          No {{ section.label }} ranked yet.
        </div>
      </div>
    </div>
  </section>
</template>
