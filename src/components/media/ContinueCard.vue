<script setup lang="ts">
import { computed, ref } from "vue";
import MediaCard from "./MediaCard.vue";
import { logWatch } from "@/composables/useMediaActions";

// Continue watching can log the next episode without opening the media page.
// The count updates optimistically and reverts on failure.
const props = defineProps<{
  mediaId: string;
  title: string;
  slug: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  watchedEpisodeCount: number;
  airedEpisodeCount: number | null;
}>();

const count = ref(props.watchedEpisodeCount);
const saving = ref(false);
const completed = ref(false);

const progress = computed(() => {
  if (props.mediaType !== "show") return null;
  return props.airedEpisodeCount !== null
    ? `${count.value} / ${props.airedEpisodeCount}`
    : `${count.value} ep`;
});

const atEnd = computed(
  () => props.airedEpisodeCount !== null && count.value >= props.airedEpisodeCount,
);

async function bump() {
  if (saving.value) return;
  saving.value = true;
  if (props.mediaType === "show") count.value += 1;
  const result = await logWatch(props.mediaId);
  saving.value = false;
  if (!result.ok) {
    if (props.mediaType === "show") count.value -= 1;
    return;
  }
  if (props.mediaType === "movie") completed.value = true;
}
</script>

<template>
  <MediaCard
    :title="title"
    :media-type="mediaType"
    :poster-path="posterPath"
    :release-date="releaseDate"
    :vote-average="voteAverage"
    :slug="slug"
  >
    <!-- Progress replaces the type marker; the counter already identifies a show. -->
    <template #overlay>
      <span
        v-if="progress"
        class="text-[0.6rem] font-mono px-1.5 py-0.5 rounded-md border border-border/50 bg-bg/75 backdrop-blur-sm text-fg-muted"
      >
        {{ progress }}
      </span>
    </template>

    <template #poster-action>
      <span
        v-if="completed"
        class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 backdrop-blur-sm"
        aria-label="watched"
      >
        <span class="i-lucide:check w-3.5 h-3.5 text-green-500" aria-hidden="true" />
      </span>
      <button
        v-else
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 text-fg-muted backdrop-blur-sm transition-colors hover:border-fg hover:bg-fg hover:text-bg disabled:opacity-40 focus-ring"
        :disabled="saving || (mediaType === 'show' && atEnd)"
        :aria-label="mediaType === 'show' ? 'log next episode' : 'mark watched'"
        @click="bump"
      >
        <span
          :class="mediaType === 'show' ? 'i-lucide:plus' : 'i-lucide:check'"
          class="w-3.5 h-3.5"
          aria-hidden="true"
        />
      </button>
    </template>

    <template #meta />
  </MediaCard>
</template>
