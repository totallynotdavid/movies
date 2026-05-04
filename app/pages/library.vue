<script setup lang="ts">
const { data: library } = await useFetch('/api/tracking/library', {
  credentials: 'include',
})
</script>

<template>
  <section class="container py-8 sm:py-12 flex flex-col gap-8">
    <div class="flex-split gap-4">
      <h1 class="text-2xl font-mono">library</h1>
      <TagStatic>{{ library?.entries?.length || 0 }} tracked</TagStatic>
    </div>

    <MediaSearchBox />

    <LibraryEmptyState v-if="!library?.entries?.length" />

    <div v-else class="grid gap-3">
      <LibraryEntryCard v-for="entry in library.entries" :key="entry.id" :entry="entry" />
    </div>
  </section>
</template>
