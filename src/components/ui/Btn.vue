<script setup lang="ts">
// Labeled buttons only. Icon-only chrome actions use IconBtn.
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary";
    size?: "sm" | "md";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    icon?: string;
    block?: boolean;
  }>(),
  { variant: "secondary", size: "md", type: "button" },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="group items-center justify-center gap-1.5 font-mono border rounded-md transition-colors duration-200 focus-ring disabled:opacity-40 disabled:pointer-events-none"
    :class="[
      block ? 'flex w-full' : 'inline-flex',
      size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3.5 py-2',
      variant === 'primary'
        ? 'border-transparent bg-fg text-bg hover:bg-fg/80'
        : 'border-border bg-transparent text-fg hover:bg-fg/10',
    ]"
  >
    <span
      v-if="icon"
      :class="[icon, size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4']"
      class="shrink-0"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
