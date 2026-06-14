<script setup lang="ts">
import type { MediaLayout } from "@/composables/useLayoutPreference";

// The active layout is the only filled segment.
const layout = defineModel<MediaLayout>({ default: "grid" });

const options = [
  { value: "grid", icon: "i-lucide:layout-grid", label: "grid view" },
  { value: "list", icon: "i-lucide:list", label: "list view" },
] as const;
</script>

<template>
  <div
    class="flex rounded-md border border-border p-0.5 bg-bg-subtle"
    role="group"
    aria-label="layout"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="flex items-center px-2 py-1 rounded-sm border transition-colors focus-ring"
      :class="
        layout === opt.value
          ? 'bg-bg-elevated text-fg border-border'
          : 'text-fg-muted hover:text-fg border-transparent'
      "
      :aria-pressed="layout === opt.value"
      :aria-label="opt.label"
      @click="layout = opt.value"
    >
      <span :class="opt.icon" class="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
</template>
