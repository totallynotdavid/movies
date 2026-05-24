<script setup lang="ts">
import "virtual:uno.css";
import "../src/styles/app.css";
import { Link } from "@void/vue";
import CommandPalette from "../src/components/CommandPalette.vue";
import ScrollToTop from "../src/components/ScrollToTop.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-fg">
    <a class="skip-link" href="#main-content">skip to content</a>

    <header class="sticky top-0 z-50 border-b border-border">
      <div class="absolute inset-0 bg-bg/80 backdrop-blur-md" />
      <nav
        class="relative container min-h-14 flex items-center gap-3 z-1"
        aria-label="main navigation"
      >
        <Link
          href="/"
          class="font-mono font-bold text-fg hover:text-accent transition-colors mr-4 shrink-0"
        >
          track
        </Link>

        <div class="flex items-center gap-1 text-sm text-fg-muted flex-1">
          <Link
            href="/"
            class="px-3 py-1.5 rounded-lg hover:bg-bg-elevated hover:text-fg transition-colors"
          >
            catalog
          </Link>
          <Link
            href="/library"
            class="px-3 py-1.5 rounded-lg hover:bg-bg-elevated hover:text-fg transition-colors"
          >
            library
          </Link>
          <Link
            href="/profile"
            class="px-3 py-1.5 rounded-lg hover:bg-bg-elevated hover:text-fg transition-colors"
          >
            profile
          </Link>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-subtle text-fg-muted text-sm hover:border-border-hover hover:text-fg transition-colors"
            aria-label="open command palette"
            @click="$refs.palette?.open()"
          >
            <span class="i-lucide:search w-3.5 h-3.5" aria-hidden="true" />
            <span class="font-mono text-xs">search</span>
            <span class="hidden lg:flex items-center gap-0.5 text-xs text-fg-subtle">
              <kbd class="font-mono">⌘</kbd><kbd class="font-mono">K</kbd>
            </span>
          </button>

          <Link
            href="/login"
            class="px-3 py-1.5 rounded-lg border border-border bg-bg-subtle text-fg-muted text-sm hover:border-accent/40 hover:text-fg transition-colors font-mono"
          >
            sign in
          </Link>
        </div>
      </nav>
    </header>

    <main id="main-content" class="container flex-1 py-8 sm:py-12" tabindex="-1">
      <slot />
    </main>

    <footer class="border-t border-border mt-12">
      <div class="container min-h-14 flex items-center justify-between text-fg-subtle text-xs">
        <span class="font-mono">track</span>
        <span class="font-mono">void + vite+</span>
      </div>
    </footer>

    <CommandPalette ref="palette" />
    <ScrollToTop />
  </div>
</template>
