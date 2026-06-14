<script setup lang="ts">
import { computed } from "vue";
import type { Props } from "./timeline.server";
import MediaActivitySparkline from "@/components/media/MediaActivitySparkline.vue";
import MediaHeader from "@/components/media/MediaHeader.vue";

const props = defineProps<Props>();

const maxWatches = computed(() => Math.max(...props.timeline.days.map((day) => day.watches), 1));
const summary = computed(() => [
  { label: "watches", value: props.timeline.watches.toLocaleString() },
  { label: "users", value: props.timeline.users.toLocaleString() },
  { label: "tracking", value: props.timeline.trackedCount.toLocaleString() },
]);
const latestActivity = computed(() =>
  props.timeline.lastDay ? formatDate(props.timeline.lastDay) : "no activity yet",
);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}
</script>

<template>
  <main class="flex-1 pb-8">
    <MediaHeader :media="media" page="timeline" />

    <section class="container w-full py-6 sm:py-8 lg:py-12">
      <div class="flex flex-col gap-8">
        <section
          class="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 border border-border rounded-lg bg-bg-subtle p-4 sm:p-6"
        >
          <div class="min-w-0">
            <p class="font-mono text-xs text-fg-subtle uppercase tracking-wider mb-2">
              community activity
            </p>
            <h2 class="font-mono text-lg text-fg">who is watching {{ media.title }}</h2>
            <p class="mt-2 text-sm text-fg-muted max-w-2xl">
              Recent public watch activity from Track users. Use this to see whether a title is
              picking up momentum without reading every profile.
            </p>

            <dl class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <template v-for="item in summary" :key="item.label">
                <div>
                  <dt class="text-xs text-fg-subtle">{{ item.label }}</dt>
                  <dd class="mt-1 text-xl text-fg">{{ item.value }}</dd>
                </div>
              </template>
              <div>
                <dt class="text-xs text-fg-subtle">latest</dt>
                <dd class="mt-1 text-sm text-fg">{{ latestActivity }}</dd>
              </div>
            </dl>
          </div>

          <div class="flex items-center lg:justify-end">
            <MediaActivitySparkline :points="timeline.days" />
          </div>
        </section>

        <section class="min-w-0 max-w-3xl">
          <h2 class="font-mono text-lg text-fg mb-6">timeline</h2>

          <ol v-if="timeline.days.length" class="relative border-is border-border ps-6">
            <li v-for="day in timeline.days" :key="day.date" class="relative pb-6 last:pb-0">
              <span
                class="absolute top-1 size-3 rounded-full border border-accent bg-bg"
                style="inset-inline-start: -1.8125rem"
                aria-hidden="true"
              />
              <div class="flex items-center gap-3">
                <time class="font-mono text-sm text-fg">{{ formatDate(day.date) }}</time>
                <span class="font-mono text-xs text-fg-subtle">
                  {{ day.watches }} {{ day.watches === 1 ? "watch" : "watches" }}
                </span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-bg-muted overflow-hidden">
                <div
                  class="h-full rounded-full bg-accent"
                  :style="{ width: `${(day.watches / maxWatches) * 100}%` }"
                />
              </div>
            </li>
          </ol>

          <p v-else class="text-sm text-fg-muted font-mono">
            no public watch activity has been recorded for this title yet.
          </p>
        </section>
      </div>
    </section>
  </main>
</template>
