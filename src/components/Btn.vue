<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    icon?: string;
  }>(),
  { variant: "secondary", size: "md", type: "button" },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center gap-2 rounded-lg border font-mono transition-colors focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[
      size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
      variant === 'primary'
        ? 'border-accent/40 bg-accent/10 text-fg hover:bg-accent/15'
        : variant === 'ghost'
          ? 'border-transparent bg-transparent text-fg-muted hover:text-fg hover:bg-bg-elevated'
          : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg',
    ]"
  >
    <span v-if="icon" :class="icon" class="w-4 h-4 shrink-0" aria-hidden="true" />
    <slot />
  </button>
</template>
