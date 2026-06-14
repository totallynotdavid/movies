<script setup lang="ts">
import MediaCard from "@/components/media/MediaCard.vue";
import { useResultAction } from "@/composables/useResultAction";
import type { MediaRef } from "@/shared/tracking";

// Shares tracking behavior with the row view.
const props = defineProps<{
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  media: MediaRef;
  tracked?: boolean;
}>();

const { state, doneLabel, action, act } = useResultAction({
  media: props.media,
  mediaType: props.mediaType,
  tracked: props.tracked,
});
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
    <template #poster-action>
      <span
        v-if="state === 'done'"
        class="flex h-7 items-center gap-1 rounded-full border border-border bg-bg/80 px-2 font-mono text-[0.65rem] text-fg-muted backdrop-blur-sm"
        :title="doneLabel"
      >
        <span class="i-lucide:check w-3 h-3 text-green-500" aria-hidden="true" />
        {{ doneLabel }}
      </span>
      <button
        v-else
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg/80 text-fg-muted backdrop-blur-sm transition-colors hover:border-fg hover:bg-fg hover:text-bg disabled:opacity-40 focus-ring"
        :disabled="state === 'saving'"
        :aria-label="action.label"
        :title="action.label"
        @click="act"
      >
        <span
          :class="state === 'saving' ? 'i-lucide:loader-circle animate-spin' : action.icon"
          class="w-3.5 h-3.5"
          aria-hidden="true"
        />
      </button>
    </template>
  </MediaCard>
</template>
