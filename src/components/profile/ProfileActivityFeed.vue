<script setup lang="ts">
import type { ProfileActivityItem } from "@/domain/insights/profile";

defineProps<{
  items: ProfileActivityItem[];
}>();

// Day granularity only: the feed renders the calendar day of a watch, never a
// timestamp, so it is safe on a public profile (see ProfileActivityItem).
const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function activityIcon(item: ProfileActivityItem) {
  return item.mediaType === "show" ? "i-lucide:tv" : "i-lucide:circle-play";
}

function episodeLabel(item: ProfileActivityItem) {
  if (item.seasonNumber === null || item.episodeNumber === null) return "an episode";
  return `S${item.seasonNumber}·E${item.episodeNumber}`;
}

function formatDay(watchedOn: string) {
  return dayFormatter.format(new Date(`${watchedOn}T00:00:00Z`));
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
        :class="activityIcon(item)"
        aria-hidden="true"
      />

      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="text-sm font-mono text-fg leading-snug">
          <template v-if="item.seasonNumber === null">
            Watched
            <a
              :href="`/media/${item.slug}`"
              class="text-accent hover:text-accent/80 transition-colors"
            >
              {{ item.title }}
            </a>
          </template>

          <template v-else>
            Watched {{ episodeLabel(item) }} of
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
          <span>{{ formatDay(item.watchedOn) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
