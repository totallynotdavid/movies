<script setup lang="ts">
import type { ProfileActivityItem } from "../../domain/profile-stats";

defineProps<{
  items: ProfileActivityItem[];
}>();

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

function activityIcon(item: ProfileActivityItem) {
  return item.mediaType === "show" ? "i-lucide:tv" : "i-lucide:circle-play";
}

function formatTime(watchedAt: number) {
  return `${timeFormatter.format(new Date(watchedAt))} UTC`;
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
          <template v-if="item.episodeOrdinal === null">
            Watched
            <a
              :href="`/media/${item.slug}`"
              class="text-accent hover:text-accent/80 transition-colors"
            >
              {{ item.title }}
            </a>
          </template>

          <template v-else>
            Watched episode {{ item.episodeOrdinal }} of
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
          <span>{{ formatTime(item.watchedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
