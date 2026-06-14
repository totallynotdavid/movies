<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import Modal from "@/components/ui/Modal.vue";
import MediaResultRow from "@/components/media/MediaResultRow.vue";
import { auth } from "void/client";
import { useMediaSearch } from "@/composables/useMediaSearch";

const props = defineProps<{
  user: { id: string; name: string; email: string; username?: string | null } | null;
}>();

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
const listRef = ref<HTMLElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);
const activeIndex = ref(0);

const search = useMediaSearch({ limit: 8 });

// Empty input and "/" show navigation commands; any other query searches titles.
const showCommands = computed(() => !query.value.trim() || query.value.startsWith("/"));

const commands = computed<Command[]>(() => {
  if (props.user) {
    return [
      { id: "home", label: "home", icon: "i-lucide:home", href: "/" },
      ...(props.user.username
        ? [
            {
              id: "profile",
              label: "profile",
              icon: "i-lucide:user",
              href: `/u/${props.user.username}`,
            },
          ]
        : []),
      { id: "settings", label: "settings", icon: "i-lucide:settings", href: "/settings" },
      {
        id: "signout",
        label: "sign out",
        icon: "i-lucide:log-out",
        action: async () => {
          await auth.signOut();
          window.location.href = "/";
        },
      },
    ];
  }
  return [
    { id: "browse", label: "browse catalog", icon: "i-lucide:film", href: "/" },
    { id: "login", label: "sign in", icon: "i-lucide:log-in", href: "/login" },
  ];
});

const filteredCommands = computed(() => {
  const q = query.value.replace(/^\//, "").toLowerCase().trim();
  if (!q) return commands.value;
  return commands.value.filter((c) => c.label.toLowerCase().includes(q));
});

const hasResults = computed(() => search.local.value.length > 0 || search.remote.value.length > 0);

// Flat list of everything the arrow keys can land on, in render order, so the
// palette behaves like every other ⌘K (Spotlight, Linear, Raycast): a highlight
// moves with Up/Down and Enter activates whatever is highlighted.
type Nav =
  | { kind: "command"; cmd: Command }
  | { kind: "media"; slug: string | null }
  | { kind: "seeall"; href: string };

const navItems = computed<Nav[]>(() => {
  if (showCommands.value) {
    return filteredCommands.value.map((cmd) => ({ kind: "command", cmd }) as Nav);
  }
  const items: Nav[] = [];
  for (const r of search.local.value) items.push({ kind: "media", slug: r.slug ?? null });
  for (const r of search.remote.value) items.push({ kind: "media", slug: r.slug ?? null });
  if (query.value.trim()) {
    items.push({ kind: "seeall", href: `/search?q=${encodeURIComponent(query.value.trim())}` });
  }
  return items;
});

const localCount = computed(() => search.local.value.length);

// Results shift under the cursor as the user types; keep the highlight valid.
watch(navItems, () => {
  activeIndex.value = 0;
});

function move(delta: number) {
  const count = navItems.value.length;
  if (count === 0) return;
  activeIndex.value = (activeIndex.value + delta + count) % count;
  nextTick(() => {
    listRef.value?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({
      block: "nearest",
    });
  });
}

function activate(item: Nav) {
  if (item.kind === "command") {
    if (item.cmd.href) {
      close();
      window.location.href = item.cmd.href;
    } else {
      void runCommand(item.cmd);
    }
    return;
  }
  if (item.kind === "media") {
    if (!item.slug) return;
    close();
    window.location.href = `/media/${item.slug}`;
    return;
  }
  close();
  window.location.href = item.href;
}

// Debounce title search so each keystroke does not hit the network.
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(query, (q) => {
  if (showCommands.value) return;
  search.query.value = q;
  clearTimeout(debounce);
  if (!q.trim()) {
    search.clear();
    return;
  }
  debounce = setTimeout(() => search.run(), 200);
});

function open(initial = "") {
  previouslyFocused.value =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  query.value = initial;
  search.clear();
  activeIndex.value = 0;
  isOpen.value = true;
  modalRef.value?.open();
  setTimeout(() => inputRef.value?.focus(), 50);
}

function close() {
  isOpen.value = false;
  query.value = "";
  search.clear();
  modalRef.value?.close();
  previouslyFocused.value?.focus();
  previouslyFocused.value = null;
}

function onModalClose() {
  if (isOpen.value) {
    isOpen.value = false;
    query.value = "";
    search.clear();
  }
  previouslyFocused.value?.focus();
  previouslyFocused.value = null;
}

async function runCommand(cmd: Command) {
  close();
  if (cmd.action) await cmd.action();
}

// Enter activates the highlighted row. Logging stays behind explicit row actions.
function onEnter() {
  const item = navItems.value[activeIndex.value];
  if (item) activate(item);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.isComposing) return;

  const isToggle =
    e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;
  if (isToggle) {
    e.preventDefault();
    if (isOpen.value) close();
    else open("");
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
    move(1);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    move(-1);
  }
}

defineExpose({ open, close });

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => document.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <Modal ref="modalRef" no-scroll class="max-w-xl mx-4 sm:mx-auto mt-[12vh]" @close="onModalClose">
    <div class="-m-6">
      <div class="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/60">
        <span
          class="w-4 h-4 shrink-0 text-fg-subtle"
          :class="showCommands ? 'i-lucide:chevron-right' : 'i-lucide:search'"
          aria-hidden="true"
        />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="search titles, or / for commands..."
          class="w-full bg-transparent text-fg placeholder:text-fg-subtle text-base outline-none font-mono lowercase"
          aria-label="command palette"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-list"
          @keydown.enter.prevent="onEnter"
        />
      </div>

      <div
        id="command-palette-list"
        ref="listRef"
        class="max-h-96 overflow-y-auto py-2 px-2"
        role="listbox"
      >
        <template v-if="showCommands">
          <div
            v-if="filteredCommands.length === 0"
            class="px-3 py-6 text-center text-fg-muted text-sm"
          >
            no commands found
          </div>
          <template v-for="(cmd, index) in filteredCommands" :key="cmd.id">
            <a
              v-if="cmd.href"
              :href="cmd.href"
              role="option"
              :aria-selected="activeIndex === index"
              :data-active="activeIndex === index ? 'true' : undefined"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-fg no-underline transition-colors duration-100 outline-none cursor-pointer"
              :class="activeIndex === index ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'"
              @mouseenter="activeIndex = index"
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
            <button
              v-else
              type="button"
              role="option"
              :aria-selected="activeIndex === index"
              :data-active="activeIndex === index ? 'true' : undefined"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-fg transition-colors duration-100 outline-none cursor-pointer"
              :class="activeIndex === index ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'"
              @mouseenter="activeIndex = index"
              @click="runCommand(cmd)"
            >
              <span
                v-if="cmd.icon"
                :class="cmd.icon"
                class="w-4 h-4 shrink-0 text-fg-muted"
                aria-hidden="true"
              />
              <span class="font-mono text-sm lowercase">{{ cmd.label }}</span>
            </button>
          </template>
        </template>

        <template v-else>
          <div
            v-if="search.loading.value && !hasResults"
            class="px-3 py-6 text-center text-fg-muted text-sm font-mono"
          >
            searching...
          </div>
          <div
            v-else-if="!hasResults"
            class="px-3 py-6 text-center text-fg-muted text-sm font-mono"
          >
            no titles found
          </div>
          <div v-else class="flex flex-col gap-0.5">
            <MediaResultRow
              v-for="(item, index) in search.local.value"
              :key="`local:${item.id}`"
              :title="item.title"
              :media-type="item.mediaType"
              :poster-path="item.posterPath"
              :release-date="item.releaseDate"
              :slug="item.slug"
              :media="item.id"
              :active="activeIndex === index"
              @mouseenter="activeIndex = index"
            />
            <MediaResultRow
              v-for="(item, index) in search.remote.value"
              :key="`remote:${item.mediaType}:${item.tmdbId}`"
              :title="item.title"
              :media-type="item.mediaType"
              :poster-path="item.posterPath"
              :release-date="item.releaseDate"
              :slug="item.slug"
              :media="item"
              :tracked="Boolean(item.cachedMediaId)"
              :active="activeIndex === localCount + index"
              @mouseenter="activeIndex = localCount + index"
            />
          </div>

          <!-- Full-result browsing lives on /search; the palette stays capped for quick navigation. -->
          <a
            v-if="query.trim()"
            :href="`/search?q=${encodeURIComponent(query.trim())}`"
            :data-active="activeIndex === navItems.length - 1 ? 'true' : undefined"
            class="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors duration-100 outline-none"
            :class="
              activeIndex === navItems.length - 1
                ? 'bg-bg-elevated text-fg'
                : 'text-fg-muted hover:bg-bg-elevated hover:text-fg'
            "
            @mouseenter="activeIndex = navItems.length - 1"
            @click="close"
          >
            <span class="i-lucide:search w-4 h-4 shrink-0" aria-hidden="true" />
            <span class="font-mono text-sm">see all results for "{{ query.trim() }}"</span>
            <span class="i-lucide:arrow-right w-3.5 h-3.5 ml-auto shrink-0" aria-hidden="true" />
          </a>
        </template>
      </div>

      <div
        class="px-4 py-2.5 border-t border-border/60 flex items-center gap-3 text-xs text-fg-subtle"
      >
        <span><kbd class="font-mono">↑↓</kbd> navigate</span>
        <span><kbd class="font-mono">↵</kbd> open</span>
        <span><kbd class="font-mono">/</kbd> commands</span>
        <span><kbd class="font-mono">esc</kbd> close</span>
      </div>
    </div>
  </Modal>
</template>
