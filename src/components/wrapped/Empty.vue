<script setup lang="ts">
defineProps<{ year: number }>();
</script>

<template>
  <section class="flex flex-col gap-6 border-b border-border pb-10">
    <div class="flex items-center gap-3 text-xs font-mono text-fg-muted">
      <span class="rounded-full border border-border bg-bg-subtle px-2.5 py-1">
        {{ year }} wrapped
      </span>
      <span>year to date</span>
    </div>

    <div class="flex flex-col gap-3 max-w-2xl">
      <h1 class="text-4xl sm:text-5xl font-mono font-bold">Your recap starts with one watch</h1>
      <p class="text-base text-fg-muted leading-relaxed">
        Log a movie or an episode from your library and this page will start tracking the people,
        genres, and time behind your year.
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <a
        href="/"
        class="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-mono text-fg transition-colors hover:bg-accent/15"
      >
        <span class="i-lucide:library w-4 h-4" aria-hidden="true" />
        go to your library
      </a>
    </div>
  </section>
</template>
