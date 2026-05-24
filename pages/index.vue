<script setup lang="ts">
import type { Props } from "./index.server";

const props = defineProps<Props>();
const movieCount = props.entries.filter((entry) => entry.mediaType === "movie").length;
const showCount = props.entries.filter((entry) => entry.mediaType === "show").length;
</script>

<template>
  <section class="stack">
    <div class="hero">
      <div class="badge-row">
        <span class="badge">{{ movieCount }} movies</span>
        <span class="badge">{{ showCount }} shows</span>
      </div>
      <h1>movie tracker</h1>
      <p>search titles, track status, and keep watch history in your library.</p>
      <div class="action-row">
        <a class="btn btn-primary" href="/library">open library</a>
        <a class="btn btn-secondary" href="/settings">preferences</a>
      </div>
    </div>

    <div class="stack">
      <div class="section-head">
        <h2>seeded catalog</h2>
        <p>{{ entries.length > 0 ? "available locally" : "empty" }}</p>
      </div>
      <div v-if="entries.length === 0" class="empty-card">No titles available yet.</div>
      <div v-else class="card-grid">
        <article v-for="entry in entries" :key="entry.id" class="card">
          <div class="card-head">
            <p>{{ entry.title }}</p>
            <span class="badge">{{ entry.mediaType }}</span>
          </div>
          <p class="card-muted">Popularity: {{ entry.popularity ?? 0 }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
