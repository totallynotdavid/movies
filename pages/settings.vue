<script setup lang="ts">
import type { Props } from "./settings.server";

const props = defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-8 max-w-xl">
    <div>
      <h1 class="text-3xl font-mono font-bold">settings</h1>
      <p class="text-fg-muted text-sm mt-1">account and preferences</p>
    </div>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">account</h2>
      <div
        class="rounded-xl border border-border bg-bg-subtle overflow-hidden divide-y divide-border"
      >
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-xs font-mono text-fg-muted">email</span>
          <span class="text-sm font-mono text-fg">{{ user.email }}</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-xs font-mono text-fg-muted">role</span>
          <span
            class="text-xs font-mono px-2 py-0.5 rounded-full border border-border bg-bg-elevated text-fg-muted"
          >
            {{ role }}
          </span>
        </div>
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-xs font-mono text-fg-muted">name</span>
          <span class="text-sm font-mono text-fg">{{ user.name }}</span>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">actions</h2>
      <div
        class="rounded-xl border border-border bg-bg-subtle overflow-hidden divide-y divide-border"
      >
        <a
          href="/profile"
          class="flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
        >
          <span class="text-sm font-mono text-fg-muted">view profile</span>
          <span class="i-lucide:arrow-right w-4 h-4 text-fg-subtle" aria-hidden="true" />
        </a>
        <a
          href="/library"
          class="flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors"
        >
          <span class="text-sm font-mono text-fg-muted">go to library</span>
          <span class="i-lucide:arrow-right w-4 h-4 text-fg-subtle" aria-hidden="true" />
        </a>
      </div>
    </section>
  </div>
</template>
