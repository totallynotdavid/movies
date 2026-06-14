<script setup lang="ts">
import { computed } from "vue";
import { useResultAction } from "@/composables/useResultAction";
import type { MediaRef } from "@/shared/tracking";
import { tmdbImage } from "@/components/tmdb-image";

const props = defineProps<{
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  slug?: string | null;
  media: MediaRef;
  tracked?: boolean;
  active?: boolean;
}>();

const year = computed(() => (props.releaseDate ? new Date(props.releaseDate).getFullYear() : null));
const href = computed(() => (props.slug ? `/media/${props.slug}` : undefined));

const { state, doneLabel, action, act } = useResultAction({
  media: props.media,
  mediaType: props.mediaType,
  tracked: props.tracked,
});
</script>

<template>
  <div
    class="flex items-center gap-2 rounded-lg pr-1.5 transition-colors"
    :class="active ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'"
    :data-active="active ? 'true' : undefined"
  >
    <a :href="href" class="flex min-w-0 flex-1 items-center gap-3 px-2 py-1.5 no-underline">
      <div class="w-8 h-12 shrink-0 overflow-hidden rounded bg-bg-elevated">
        <img
          v-if="posterPath"
          :src="tmdbImage(posterPath, 'w92')"
          :alt="`${title} poster`"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="min-w-0 flex flex-col">
        <span class="truncate font-mono text-sm text-fg">{{ title }}</span>
        <span class="font-mono text-xs text-fg-subtle">
          {{ mediaType }}<span v-if="year"> · {{ year }}</span>
        </span>
      </div>
    </a>

    <span
      v-if="state === 'done'"
      class="shrink-0 inline-flex items-center gap-1 px-2 py-1 font-mono text-xs text-fg-subtle"
    >
      <span class="i-lucide:check w-3.5 h-3.5 text-green-500" aria-hidden="true" />
      {{ doneLabel }}
    </span>
    <button
      v-else
      type="button"
      class="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-bg-subtle px-2.5 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-fg hover:bg-fg hover:text-bg disabled:opacity-60 focus-ring"
      :disabled="state === 'saving'"
      @click="act"
    >
      <span :class="action.icon" class="w-3.5 h-3.5" aria-hidden="true" />
      {{ state === "saving" ? "..." : action.label }}
    </button>
  </div>
</template>
