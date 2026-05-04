<script setup lang="ts">
type MediaType = "movie" | "show";

const q = ref("");
const type = ref<MediaType | "">("");
const selectedType = computed(() => type.value || undefined);
const enabled = computed(() => q.value.trim().length > 1);

const { data, pending, execute } = await useFetch("/api/media/search", {
  query: { q, type: selectedType },
  immediate: false,
  watch: false,
});

const search = useDebounceFn(() => {
  if (enabled.value) execute();
}, 250);

watch([q, type], search);
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-col sm:flex-row gap-2">
      <InputBase
        v-model="q"
        type="search"
        name="q"
        placeholder="Search TMDB and local titles"
        class="flex-1"
      />
      <select
        v-model="type"
        class="bg-bg-subtle border border-border rounded-lg px-3 py-2 font-mono text-sm text-fg"
        aria-label="media type"
      >
        <option value="">all</option>
        <option value="movie">movie</option>
        <option value="show">show</option>
      </select>
      <ButtonBase :disabled="!enabled || pending" classicon="i-lucide-search" @click="execute()">
        search
      </ButtonBase>
    </div>

    <div v-if="data?.entries?.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="entry in data.entries" :key="entry.id">
        <div class="grid gap-2">
          <div class="flex-split gap-3">
            <p class="font-mono text-sm">{{ entry.title }}</p>
            <TagStatic>{{ entry.type }}</TagStatic>
          </div>
          <p class="text-sm text-fg-muted line-clamp-3">
            {{ entry.overview || "No overview stored." }}
          </p>
          <NuxtLink class="font-mono text-xs text-accent" :to="`/media/${entry.id}`">open</NuxtLink>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
