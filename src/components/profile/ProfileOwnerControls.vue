<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ isPrivate: boolean }>();

const badge = computed(() =>
  props.isPrivate
    ? {
        icon: "i-lucide:lock",
        classes: "border-border bg-bg-subtle text-fg-muted",
        label: "private · only you can see this",
      }
    : {
        icon: "i-lucide:globe",
        classes: "border-accent/30 bg-accent/10 text-accent",
        label: "public",
      },
);
</script>

<template>
  <div class="flex items-center gap-3">
    <span
      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono"
      :class="badge.classes"
    >
      <span class="h-3 w-3" :class="badge.icon" aria-hidden="true" />
      {{ badge.label }}
    </span>
    <a
      href="/settings"
      class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-mono text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-ring"
    >
      <span class="i-lucide:pencil h-3 w-3" aria-hidden="true" />
      edit profile
    </a>
  </div>
</template>
