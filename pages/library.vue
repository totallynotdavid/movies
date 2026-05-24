<script setup lang="ts">
import { computed, ref } from "vue";
import type { Props } from "./library.server";

const props = defineProps<Props>();

type RemoteCandidate = {
  mediaType: "movie" | "show";
  providerId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  slug: string;
  cached: boolean;
  cachedMediaId: string | null;
};

const query = ref("");
const loading = ref(false);
const searchError = ref("");
const searchLocal = ref<Array<{ id: string; title: string; mediaType: string }>>([]);
const searchRemote = ref<RemoteCandidate[]>([]);
const remoteEnabled = ref(false);

const trackedIds = computed(() => new Set(props.entries.map((entry) => entry.media.id)));

async function runSearch() {
  searchError.value = "";
  const q = query.value.trim();

  if (!q) {
    searchLocal.value = [];
    searchRemote.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await fetch(`/api/media/search?q=${encodeURIComponent(q)}&limit=12`);
    const payload = (await res.json()) as {
      error?: string;
      remoteEnabled?: boolean;
      local?: Array<{ id: string; title: string; mediaType: string }>;
      remote?: RemoteCandidate[];
    };

    if (!res.ok) {
      throw new Error(payload.error || "Search failed");
    }

    remoteEnabled.value = Boolean(payload.remoteEnabled);
    searchLocal.value = payload.local ?? [];
    searchRemote.value = payload.remote ?? [];
  } catch (error) {
    searchError.value = error instanceof Error ? error.message : "Search failed";
  } finally {
    loading.value = false;
  }
}

async function addFromRemote(item: RemoteCandidate) {
  searchError.value = "";

  try {
    const cacheResponse = await fetch("/api/media/cache", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item),
    });
    const cachePayload = (await cacheResponse.json()) as { error?: string; mediaId?: string };

    if (!cacheResponse.ok || !cachePayload.mediaId) {
      throw new Error(cachePayload.error || "Failed to cache media");
    }

    const trackResponse = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: cachePayload.mediaId, status: "planned" }),
    });

    if (!trackResponse.ok) {
      const trackPayload = (await trackResponse.json()) as { error?: string };
      throw new Error(trackPayload.error || "Failed to add to library");
    }

    window.location.reload();
  } catch (error) {
    searchError.value = error instanceof Error ? error.message : "Failed to add media";
  }
}

async function addFromLocal(mediaId: string) {
  searchError.value = "";

  try {
    const response = await fetch("/api/tracking/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId, status: "planned" }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Failed to add to library");
    }

    window.location.reload();
  } catch (error) {
    searchError.value = error instanceof Error ? error.message : "Failed to add media";
  }
}
</script>

<template>
  <section class="stack">
    <div class="section-head">
      <h1>{{ user.name }}'s library</h1>
      <span class="badge">{{ entries.length }} tracked</span>
    </div>
    <p class="subtle">authenticated tracking list from redesigned tables.</p>

    <div class="card stack">
      <h2>add media</h2>
      <div class="search-row">
        <input v-model="query" type="search" placeholder="Search TMDB or local catalog" />
        <button class="btn btn-primary" type="button" :disabled="loading" @click="runSearch">
          {{ loading ? "Searching..." : "Search" }}
        </button>
      </div>
      <p v-if="!remoteEnabled" class="card-muted">
        TMDB token is missing. Showing local matches only.
      </p>
      <p v-if="searchError" class="error-text">{{ searchError }}</p>

      <div v-if="searchLocal.length > 0" class="stack">
        <h3 class="section-title">local matches</h3>
        <div class="list-grid">
          <article v-for="item in searchLocal" :key="item.id" class="card">
            <div class="card-head">
              <p>{{ item.title }}</p>
              <span class="badge">{{ item.mediaType }}</span>
            </div>
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="trackedIds.has(item.id)"
              @click="addFromLocal(item.id)"
            >
              {{ trackedIds.has(item.id) ? "Already tracked" : "Add" }}
            </button>
          </article>
        </div>
      </div>

      <div v-if="searchRemote.length > 0" class="stack">
        <h3 class="section-title">tmdb matches</h3>
        <div class="list-grid">
          <article
            v-for="item in searchRemote"
            :key="`${item.mediaType}:${item.providerId}`"
            class="card"
          >
            <div class="card-head">
              <p>{{ item.title }}</p>
              <span class="badge">{{ item.mediaType }}</span>
            </div>
            <p class="card-muted">
              {{ item.releaseDate || "n/a" }} · score {{ item.voteAverage ?? "?" }}
            </p>
            <button
              class="btn btn-secondary"
              type="button"
              :disabled="Boolean(item.cachedMediaId && trackedIds.has(item.cachedMediaId))"
              @click="addFromRemote(item)"
            >
              {{
                item.cachedMediaId && trackedIds.has(item.cachedMediaId)
                  ? "Already tracked"
                  : "Cache + add"
              }}
            </button>
          </article>
        </div>
      </div>
    </div>

    <div v-if="entries.length === 0" class="empty-card">
      No entries yet. Search above and add a title to start tracking.
    </div>

    <div v-else class="list-grid">
      <article v-for="entry in entries" :key="entry.id" class="card">
        <div class="card-head">
          <p>{{ entry.media.title }}</p>
          <span class="badge">{{ entry.status }}</span>
        </div>
        <p class="card-muted">
          Progress: {{ entry.progressCurrent }}/{{ entry.progressTotal ?? "?" }}
        </p>
      </article>
    </div>
  </section>
</template>
