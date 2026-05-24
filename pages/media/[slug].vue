<script setup lang="ts">
import { ref } from "vue";
import type { Props } from "./[slug].server";

const TMDB_IMG_W500 = "https://image.tmdb.org/t/p/w500";
const TMDB_IMG_ORIG = "https://image.tmdb.org/t/p/original";

const props = defineProps<Props>();

const favorited = ref(props.isFavorited);
const addingFav = ref(false);
const favError = ref("");

const year = props.media.releaseDate ? new Date(props.media.releaseDate).getFullYear() : null;
const rating = props.media.voteAverage ? (props.media.voteAverage / 2).toFixed(1) : null;

const statusClass: Record<string, string> = {
  planned: "badge-planned border",
  watching: "badge-watching border",
  completed: "badge-completed border",
  paused: "badge-paused border",
  dropped: "badge-dropped border",
};

async function toggleFavorite() {
  if (!props.user) {
    window.location.href = "/login";
    return;
  }

  addingFav.value = true;
  favError.value = "";

  try {
    const res = await fetch("/api/user/favorites", {
      method: favorited.value ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "media", mediaId: props.media.id }),
    });
    if (!res.ok) {
      const p = (await res.json()) as { error?: string };
      throw new Error(p.error ?? "failed");
    }
    favorited.value = !favorited.value;
  } catch (err) {
    favError.value = err instanceof Error ? err.message : "failed";
  } finally {
    addingFav.value = false;
  }
}

async function addToLibrary() {
  if (!props.user) {
    window.location.href = "/login";
    return;
  }

  const res = await fetch("/api/tracking/library", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mediaId: props.media.id, status: "planned" }),
  });

  if (res.ok) {
    window.location.reload();
  }
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Backdrop -->
    <div
      v-if="media.backdropPath"
      class="relative -mx-4 sm:-mx-6 -mt-8 sm:-mt-12 h-52 sm:h-72 overflow-hidden rounded-b-2xl"
    >
      <img
        :src="`${TMDB_IMG_ORIG}${media.backdropPath}`"
        :alt="`${media.title} backdrop`"
        class="w-full h-full object-cover object-top"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
    </div>

    <!-- Main content -->
    <div class="flex flex-col sm:flex-row gap-8">
      <!-- Poster -->
      <div class="shrink-0 w-40 sm:w-48">
        <div class="poster-wrap">
          <img
            v-if="media.posterPath"
            :src="`${TMDB_IMG_W500}${media.posterPath}`"
            :alt="`${media.title} poster`"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-bg-elevated text-fg-subtle text-xs font-mono"
          >
            no poster
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="flex flex-col gap-4 flex-1 min-w-0">
        <div class="flex items-start gap-3 flex-wrap">
          <h1 class="text-3xl font-mono font-bold flex-1">{{ media.title }}</h1>
          <span
            class="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full border border-border bg-bg-subtle text-fg-muted"
          >
            {{ media.mediaType }}
          </span>
        </div>

        <div class="flex items-center gap-3 text-sm font-mono text-fg-muted flex-wrap">
          <span v-if="year">{{ year }}</span>
          <span v-if="year && rating" aria-hidden="true">·</span>
          <span v-if="rating">★ {{ rating }}/5</span>
          <span v-if="media.voteCount" aria-hidden="true">·</span>
          <span v-if="media.voteCount">{{ media.voteCount.toLocaleString() }} votes</span>
        </div>

        <p v-if="media.overview" class="text-fg-muted text-sm leading-relaxed max-w-prose">
          {{ media.overview }}
        </p>

        <!-- Library status -->
        <div v-if="libraryEntry" class="flex items-center gap-3">
          <span
            class="text-xs font-mono px-2.5 py-1 rounded-full"
            :class="statusClass[libraryEntry.status]"
          >
            {{ libraryEntry.status }}
          </span>
          <span v-if="libraryEntry.score100" class="text-xs font-mono text-fg-muted">
            score: {{ Math.round(libraryEntry.score100 / 10) }}/10
          </span>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 flex-wrap">
          <button
            v-if="!libraryEntry"
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/40 bg-accent/10 text-fg text-sm font-mono hover:bg-accent/15 transition-colors"
            @click="addToLibrary"
          >
            <span class="i-lucide:plus w-4 h-4" aria-hidden="true" />
            add to library
          </button>

          <a
            v-else
            href="/library"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-bg-subtle text-fg-muted text-sm font-mono hover:border-border-hover hover:text-fg transition-colors"
          >
            <span class="i-lucide:library w-4 h-4" aria-hidden="true" />
            manage in library
          </a>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono transition-colors"
            :class="
              favorited
                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15'
                : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
            "
            :disabled="addingFav"
            @click="toggleFavorite"
          >
            <span
              class="w-4 h-4"
              :class="favorited ? 'i-lucide:heart-off' : 'i-lucide:heart'"
              aria-hidden="true"
            />
            {{ favorited ? "unfavorite" : "favorite" }}
          </button>
        </div>

        <p v-if="favError" class="text-sm text-red-400 font-mono">{{ favError }}</p>
      </div>
    </div>
  </div>
</template>
