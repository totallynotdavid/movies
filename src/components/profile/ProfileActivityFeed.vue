<script setup lang="ts">
import type { ProfileActivityItem } from "../../domain/activity";

const props = defineProps<{
  items: ProfileActivityItem[];
}>();

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

function activityIcon(kind: ProfileActivityItem["kind"]) {
  if (kind === "episode_watched") return "i-lucide:tv";
  if (kind === "media_completed") return "i-lucide:check";
  return "i-lucide:circle-play";
}

function progressLabel(item: ProfileActivityItem) {
  if (item.kind !== "episode_watched" || item.progressCurrent === null) return null;
  if (item.progressTotal !== null) {
    return `${item.progressCurrent}/${item.progressTotal} episodes`;
  }
  return `${item.progressCurrent} episodes`;
}

function formatTime(occurredAt: number) {
  return `${timeFormatter.format(new Date(occurredAt))} UTC`;
}
</script>

<template>
  <div
    v-if="items.length === 0"
    class="rounded-xl border border-dashed border-border px-4 py-6 text-sm font-mono text-fg-subtle"
  >
    Activity will appear here after you log a watch.
  </div>

  <div
    v-else
    class="flex flex-col divide-y divide-border rounded-xl border border-border bg-bg-subtle"
  >
    <div v-for="item in items" :key="item.id" class="flex items-start gap-3 px-4 py-3">
      <span
        class="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle"
        :class="activityIcon(item.kind)"
        aria-hidden="true"
      />

      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="text-sm font-mono text-fg leading-snug">
          <template v-if="item.kind === 'movie_watched'">
            Watched
            <a
              :href="`/media/${item.slug}`"
              class="text-accent hover:text-accent/80 transition-colors"
            >
              {{ item.title }}
            </a>
          </template>

          <template v-else-if="item.kind === 'episode_watched'">
            Watched episode {{ item.episodeNumber }} of
            <a
              :href="`/media/${item.slug}`"
              class="text-accent hover:text-accent/80 transition-colors"
            >
              {{ item.title }}
            </a>
          </template>

          <template v-else>
            Completed
            <a
              :href="`/media/${item.slug}`"
              class="text-accent hover:text-accent/80 transition-colors"
            >
              {{ item.title }}
            </a>
          </template>
        </p>

        <div
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] font-mono text-fg-subtle"
        >
          <span>{{ formatTime(item.occurredAt) }}</span>
          <span v-if="progressLabel(item)" aria-hidden="true">·</span>
          <span v-if="progressLabel(item)">{{ progressLabel(item) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
