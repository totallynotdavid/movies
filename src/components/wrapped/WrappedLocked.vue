<script setup lang="ts">
// Soft-lock state for a public year recap that has not unlocked yet.
// Applies to the current year before December.
// The owner still accesses the in-progress recap at /wrapped.
const props = defineProps<{ year: number; displayName: string }>();
</script>

<template>
  <section
    class="flex flex-col items-center gap-4 rounded-2xl border border-border bg-bg-subtle px-6 py-16 text-center"
  >
    <span class="i-lucide:lock h-8 w-8 text-fg-subtle" aria-hidden="true" />
    <h1 class="text-2xl sm:text-3xl font-mono font-bold">
      {{ props.displayName }}'s {{ props.year }} wrapped
    </h1>
    <p class="max-w-md text-sm text-fg-muted leading-relaxed">
      This recap unlocks on December 1, once the year is complete enough to share. Check back then.
    </p>
  </section>
</template>
