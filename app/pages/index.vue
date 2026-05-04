<script setup lang="ts">
const { data: catalog } = await useFetch('/api/media/catalog', {
  query: { limit: 12 },
})
</script>

<template>
  <section class="container py-8 sm:py-12 flex flex-col gap-8">
    <div class="max-w-3xl flex flex-col gap-4 animate-fade-in">
      <div class="flex flex-wrap items-center gap-2">
        <TagStatic>{{ catalog?.counts.movies || 0 }} movies</TagStatic>
        <TagStatic>{{ catalog?.counts.shows || 0 }} shows</TagStatic>
      </div>
      <h1 class="text-2xl sm:text-4xl font-mono">movie tracker</h1>
      <p class="text-fg-muted">
        search titles, track status, and keep watch history in your library.
      </p>
      <div class="inline-flex flex-wrap items-center gap-2">
        <LinkBase to="/library" variant="button-primary">open library</LinkBase>
        <LinkBase to="/settings" variant="button-secondary">preferences</LinkBase>
      </div>
    </div>

    <div>
      <div class="mb-3 flex-split gap-4">
        <h2 class="font-mono text-lg">seeded catalog</h2>
        <p class="text-xs text-fg-muted font-mono">
          {{ catalog?.generatedAt ? 'available locally' : 'empty' }}
        </p>
      </div>

      <div v-if="!catalog?.entries.length" class="bg-bg-subtle border border-border rounded-lg p-6 text-fg-muted">
        No titles available yet.
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BaseCard v-for="entry in catalog.entries" :key="entry.id">
          <div class="flex flex-col gap-3">
            <div class="flex-split gap-3">
              <p class="font-mono text-sm">{{ entry.title }}</p>
              <TagStatic>{{ entry.type }}</TagStatic>
            </div>
            <p class="line-clamp-3 text-sm text-fg-muted">
              {{ entry.overview || 'No overview stored.' }}
            </p>
            <div class="flex flex-wrap gap-1">
              <TagStatic v-for="genre in entry.genreNames.slice(0, 3)" :key="genre">
                {{ genre }}
              </TagStatic>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </section>
</template>
