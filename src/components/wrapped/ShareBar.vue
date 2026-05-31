<script setup lang="ts">
import { formatShare } from "./format";

defineProps<{ share: number }>();

// Floor the rendered width so a non-zero share is always visible as a sliver.
function barStyle(share: number) {
  if (share <= 0) return { width: "0%" };
  return { width: `${Math.max(12, Math.round(share * 100))}%` };
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="h-2 flex-1 rounded-full bg-bg-elevated">
      <div class="h-full rounded-full bg-accent/80" :style="barStyle(share)" />
    </div>
    <span class="w-10 text-right text-[0.65rem] font-mono text-fg-subtle">
      {{ formatShare(share) }}
    </span>
  </div>
</template>
