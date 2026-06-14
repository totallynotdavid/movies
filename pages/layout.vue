<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import "virtual:uno.css";
import "@/styles/app.css";
import { useShared } from "@void/vue";
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import CommandPalette from "@/components/CommandPalette.vue";
import ScrollToTop from "@/components/ui/ScrollToTop.vue";

const shared = useShared();
const user = shared.user;
const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null);

function openPalette() {
  paletteRef.value?.open("");
}

function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function focusSearch() {
  const input = document.querySelector<HTMLInputElement>('input[type="search"], input[name="q"]');
  if (input) {
    input.focus();
    return;
  }
  window.location.href = "/search";
}

function onKeydown(e: KeyboardEvent) {
  if (e.isComposing) return;

  if (e.key === "?" && !isEditable(e.target)) {
    e.preventDefault();
    document.documentElement.dataset.kbdHints = "true";
    return;
  }

  if (e.key === "/" && !isEditable(e.target) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    focusSearch();
  }
}

function onKeyup(e: KeyboardEvent) {
  if (e.key === "?") {
    document.documentElement.dataset.kbdHints = "";
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("keyup", onKeyup);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("keyup", onKeyup);
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-fg">
    <a class="skip-link" href="#main-content">skip to content</a>

    <AppHeader :user="user" @open-palette="openPalette" />

    <div id="main-content" class="flex-1 flex flex-col" tabindex="-1">
      <slot />
    </div>

    <CommandPalette ref="paletteRef" :user="user" />
    <AppFooter />
    <ScrollToTop />
  </div>
</template>
