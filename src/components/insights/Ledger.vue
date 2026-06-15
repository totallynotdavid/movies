<script setup lang="ts">
import { computed } from "vue";
import type { Ledger } from "@/domain/insights/mirror";
import ProfileSection from "@/components/identity/ProfileSection.vue";

const props = defineProps<{
  ledger: Ledger;
}>();

// The honest mirror: only worth a section if there's something honest to show.
const hasLedger = computed(() => props.ledger.droppedCount > 0 || props.ledger.ghosted.length > 0);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function since(lastWatchedAt: number) {
  return dateFormatter.format(new Date(lastWatchedAt));
}

const droppedText = computed(() => {
  const n = props.ledger.droppedCount;
  if (n === 0) return "";
  return n === 1 ? "1 title dropped" : `${n} titles dropped`;
});
</script>

<template>
  <ProfileSection
    v-if="hasLedger"
    title="the honest ledger"
    subtitle="The shows you drifted away from, no judgement."
    class="motion-safe:animate-slide-up animate-fill-both"
    style="animation-delay: 0.175s"
  >
    <div class="flex flex-col gap-3">
      <p v-if="droppedText" class="text-[0.8rem] font-mono text-fg-subtle">{{ droppedText }}.</p>

      <ul
        v-if="ledger.ghosted.length > 0"
        class="flex flex-col divide-y divide-border rounded-lg border border-border bg-bg-subtle"
      >
        <li
          v-for="show in ledger.ghosted"
          :key="show.mediaId"
          class="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div class="flex min-w-0 flex-col gap-0.5">
            <a
              :href="`/media/${show.slug}`"
              class="truncate text-sm font-mono text-fg transition-colors hover:text-accent"
            >
              {{ show.title }}
            </a>
            <span class="text-[0.7rem] font-mono text-fg-subtle">
              {{ show.watchedEpisodeCount }} / {{ show.airedEpisodeCount }} episodes · since
              {{ since(show.lastWatchedAt) }}
            </span>
          </div>
          <a
            :href="`/media/${show.slug}`"
            class="shrink-0 rounded-md border border-border px-2 py-1 text-[0.7rem] font-mono text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
          >
            pick back up
          </a>
        </li>
      </ul>
    </div>
  </ProfileSection>
</template>
