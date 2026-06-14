<script setup lang="ts">
defineProps<{
  items: { id: string; name: string; slug: string; sub?: string | null }[];
}>();
</script>

<template>
  <div class="flex flex-wrap gap-x-8 gap-y-3 text-sm font-mono">
    <div v-for="item in items" :key="item.id" class="flex flex-col">
      <a :href="`/person/${item.slug}`" class="text-fg hover:text-accent transition-colors">
        {{ item.name }}
      </a>
      <span v-if="item.sub" class="text-fg-subtle text-xs">{{ item.sub }}</span>
    </div>
  </div>
</template>
