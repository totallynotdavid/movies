<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary";
    size?: "sm" | "md";
    type?: "button" | "submit";
    disabled?: boolean;
    block?: boolean;
    classicon?: string;
    ariaKeyshortcuts?: string;
  }>(),
  { variant: "secondary", size: "md", type: "button" },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled ? true : undefined"
    class="group gap-x-1 items-center justify-center font-mono border border-border rounded-md transition-all duration-200 cursor-pointer disabled:(opacity-40 cursor-not-allowed border-transparent)"
    :class="{
      'inline-flex': !block,
      flex: block,
      'text-sm px-4 py-2': size === 'md',
      'text-xs px-2 py-0.5': size === 'sm',
      'bg-transparent text-fg hover:enabled:(bg-fg/10) focus-visible:enabled:(bg-fg/10) aria-pressed:(bg-fg/10 border-fg/20 hover:enabled:(bg-fg/20 text-fg/50))':
        variant === 'secondary',
      'text-bg bg-fg hover:enabled:(bg-fg/50) focus-visible:enabled:(bg-fg/50) aria-pressed:(bg-fg text-bg border-fg hover:enabled:(text-bg/50))':
        variant === 'primary',
    }"
    :aria-keyshortcuts="ariaKeyshortcuts"
  >
    <span v-if="classicon" class="size-[1em]" :class="classicon" aria-hidden="true" />
    <slot />
    <kbd
      v-if="ariaKeyshortcuts"
      data-kbd-hint
      class="ms-2 inline-flex items-center justify-center w-4 h-4 text-xs text-fg bg-bg-muted border border-border rounded no-underline"
      aria-hidden="true"
    >
      {{ ariaKeyshortcuts }}
    </kbd>
  </button>
</template>
