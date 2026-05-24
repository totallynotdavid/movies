<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Modal from "./Modal.vue";

type Command = {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  action?: () => void | Promise<void>;
};

const isOpen = ref(false);
const query = ref("");
const modalRef = ref<InstanceType<typeof Modal> | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

const commands: Command[] = [
  { id: "home", label: "catalog", icon: "i-lucide:film", href: "/" },
  { id: "library", label: "my library", icon: "i-lucide:library", href: "/library" },
  { id: "profile", label: "profile", icon: "i-lucide:user", href: "/profile" },
  { id: "settings", label: "settings", icon: "i-lucide:settings", href: "/settings" },
  { id: "login", label: "sign in", icon: "i-lucide:log-in", href: "/login" },
];

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (!q) return commands;
  return commands.filter((c) => c.label.toLowerCase().includes(q));
});

function open() {
  previouslyFocused.value =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  isOpen.value = true;
  modalRef.value?.open();
  setTimeout(() => inputRef.value?.focus(), 50);
}

function close() {
  isOpen.value = false;
  query.value = "";
  modalRef.value?.close();
  previouslyFocused.value?.focus();
  previouslyFocused.value = null;
}

function onModalClose() {
  if (isOpen.value) {
    isOpen.value = false;
    query.value = "";
  }
  previouslyFocused.value?.focus();
  previouslyFocused.value = null;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.isComposing) return;

  const isToggle =
    e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;

  if (isToggle) {
    e.preventDefault();
    if (isOpen.value) {
      close();
    } else {
      open();
    }
    return;
  }

  if (!isOpen.value) return;

  if (e.key === "Escape") {
    e.preventDefault();
    close();
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const items = getItems();
    const idx = items.indexOf(document.activeElement as HTMLElement);
    items[idx < 0 ? 0 : Math.min(idx + 1, items.length - 1)]?.focus();
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    const items = getItems();
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (idx <= 0) {
      inputRef.value?.focus();
    } else {
      items[idx - 1]?.focus();
    }
    return;
  }
}

function getItems() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-palette-item]"));
}

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => document.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <Modal ref="modalRef" no-scroll class="max-w-xl mx-4 sm:mx-auto mt-[12vh]" @close="onModalClose">
    <div class="-m-6">
      <div class="px-4 pt-4 pb-3 border-b border-border/60">
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="type a command or search..."
          class="w-full bg-transparent text-fg placeholder:text-fg-subtle text-base outline-none font-mono lowercase"
          aria-label="command palette search"
        />
      </div>

      <div class="max-h-72 overflow-y-auto py-2 px-2">
        <div v-if="filtered.length === 0" class="px-3 py-6 text-center text-fg-muted text-sm">
          no commands found
        </div>

        <a
          v-for="cmd in filtered"
          :key="cmd.id"
          :href="cmd.href"
          data-palette-item
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-fg no-underline transition-colors duration-100 hover:bg-bg-elevated focus:bg-bg-elevated outline-none cursor-pointer"
          @click="close"
        >
          <span
            v-if="cmd.icon"
            :class="cmd.icon"
            class="w-4 h-4 shrink-0 text-fg-muted"
            aria-hidden="true"
          />
          <span class="font-mono text-sm lowercase">{{ cmd.label }}</span>
        </a>
      </div>

      <div
        class="px-4 py-2.5 border-t border-border/60 flex items-center gap-3 text-xs text-fg-subtle"
      >
        <span><kbd class="font-mono">↑↓</kbd> navigate</span>
        <span><kbd class="font-mono">↵</kbd> open</span>
        <span><kbd class="font-mono">esc</kbd> close</span>
      </div>
    </div>
  </Modal>
</template>
