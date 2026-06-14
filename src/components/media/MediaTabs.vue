<script setup lang="ts">
import { Link } from "@void/vue";

// Each title tab is a page with its own loader, not a client-side panel switcher.
const props = defineProps<{ slug: string; active: "overview" | "cast" | "crew" }>();

const tabs = [
  {
    key: "overview",
    label: "overview",
    icon: "i-lucide:square-play",
    href: `/media/${props.slug}`,
  },
  {
    key: "cast",
    label: "cast",
    icon: "i-lucide:users",
    href: `/media/${props.slug}/cast`,
  },
  {
    key: "crew",
    label: "crew",
    icon: "i-lucide:clapperboard",
    href: `/media/${props.slug}/crew`,
  },
] as const;
</script>

<template>
  <nav
    class="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-subtle p-0.5"
    aria-label="title sections"
  >
    <Link
      v-for="tab in tabs"
      :key="tab.key"
      :href="tab.href"
      :aria-current="tab.key === active ? 'page' : undefined"
      class="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-xs border transition-colors focus-ring"
      :class="
        tab.key === active
          ? 'bg-bg border-border text-fg shadow-sm'
          : 'border-transparent text-fg-subtle hover:text-fg'
      "
    >
      <span :class="tab.icon" class="w-3.5 h-3.5" aria-hidden="true" />
      {{ tab.label }}
    </Link>
  </nav>
</template>
