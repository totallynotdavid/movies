<script setup lang="ts">
import { ref } from "vue";
import type { Props } from "./settings.server";
import type { RatingSystem } from "../src/domain/rating";
import { useColorTheme } from "../src/composables/useColorTheme";

const props = defineProps<Props>();
const { theme, toggle } = useColorTheme();

const ratingSystem = ref<RatingSystem>(props.ratingSystem);

const ratingOptions: { value: RatingSystem; label: string }[] = [
  { value: "score5", label: "/ 5" },
  { value: "score10", label: "/ 10" },
  { value: "score100", label: "/ 100" },
];

async function setRatingSystem(system: RatingSystem) {
  ratingSystem.value = system;
  await fetch("/api/user/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ratingSystem: system }),
  });
}
</script>

<template>
  <div class="flex flex-col gap-8 max-w-xl">
    <div>
      <h1 class="text-3xl font-mono font-bold">settings</h1>
      <p class="text-fg-muted text-sm mt-1">account and preferences</p>
    </div>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">preferences</h2>
      <div
        class="rounded-xl border border-border bg-bg-subtle overflow-hidden divide-y divide-border"
      >
        <div class="flex items-center justify-between px-4 py-3 gap-4">
          <div>
            <span class="text-sm font-mono text-fg-muted">rating system</span>
            <p class="text-xs text-fg-subtle mt-0.5">how scores are displayed</p>
          </div>
          <div
            class="flex rounded-lg border border-border overflow-hidden shrink-0"
            role="group"
            aria-label="rating system"
          >
            <button
              v-for="opt in ratingOptions"
              :key="opt.value"
              type="button"
              class="px-3 py-1.5 text-xs font-mono transition-colors"
              :class="
                ratingSystem === opt.value
                  ? 'bg-accent/15 text-accent'
                  : 'bg-bg-subtle text-fg-muted hover:bg-bg-elevated hover:text-fg'
              "
              @click="setRatingSystem(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between px-4 py-3">
          <div>
            <span class="text-sm font-mono text-fg-muted">color theme</span>
            <p class="text-xs text-fg-subtle mt-0.5">
              {{ theme === "dark" ? "dark" : "light" }} mode
            </p>
          </div>
          <button
            type="button"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-sm hover:border-border-hover hover:text-fg transition-colors"
            :aria-label="`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
            @click="toggle"
          >
            <span
              :class="theme === 'dark' ? 'i-lucide:sun' : 'i-lucide:moon'"
              class="w-4 h-4"
              aria-hidden="true"
            />
            <span class="font-mono text-xs">{{ theme === "dark" ? "light" : "dark" }}</span>
          </button>
        </div>
      </div>
    </section>

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
          <span class="text-xs font-mono text-fg-muted">name</span>
          <span class="text-sm font-mono text-fg">{{ user.name }}</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-xs font-mono text-fg-muted">role</span>
          <span
            class="text-xs font-mono px-2 py-0.5 rounded-full border border-border bg-bg-elevated text-fg-muted"
          >
            {{ role }}
          </span>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-mono text-fg-subtle uppercase tracking-wider">navigation</h2>
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
