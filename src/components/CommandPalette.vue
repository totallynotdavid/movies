<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
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
const previouslyFocused = ref<HTMLElement | null>(null);

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

// Enter navigates only. Logging stays behind explicit row actions.
function onEnter() {
  if (showCommands.value) {
    const cmd = filteredCommands.value[0];
    if (cmd?.href) {
      close();
      window.location.href = cmd.href;
    } else if (cmd) {
      void runCommand(cmd);
    }
    return;
  }
  const first = search.local.value[0] ?? search.remote.value[0];
  if (first?.slug) {
    close();
    window.location.href = `/media/${first.slug}`;
  }
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
          aria-live="polite"
          @keydown.enter.prevent="onEnter"
        />
      </div>

      <div class="max-h-96 overflow-y-auto py-2 px-2">
        <template v-if="showCommands">
          <div
            v-if="filteredCommands.length === 0"
            class="px-3 py-6 text-center text-fg-muted text-sm"
          >
            no commands found
          </div>
          <template v-for="cmd in filteredCommands" :key="cmd.id">
            <a
              v-if="cmd.href"
              :href="cmd.href"
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
            <button
              v-else
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-fg transition-colors duration-100 hover:bg-bg-elevated focus:bg-bg-elevated outline-none cursor-pointer"
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
              v-for="item in search.local.value"
              :key="`local:${item.id}`"
              :title="item.title"
              :media-type="item.mediaType"
              :poster-path="item.posterPath"
              :release-date="item.releaseDate"
              :slug="item.slug"
              :media="item.id"
            />
            <MediaResultRow
              v-for="item in search.remote.value"
              :key="`remote:${item.mediaType}:${item.tmdbId}`"
              :title="item.title"
              :media-type="item.mediaType"
              :poster-path="item.posterPath"
              :release-date="item.releaseDate"
              :slug="item.slug"
              :media="item"
              :tracked="Boolean(item.cachedMediaId)"
            />
          </div>

          <!-- Full-result browsing lives on /search; the palette stays capped for quick navigation. -->
          <a
            v-if="query.trim()"
            :href="`/search?q=${encodeURIComponent(query.trim())}`"
            class="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-fg-muted no-underline transition-colors duration-100 hover:bg-bg-elevated hover:text-fg focus:bg-bg-elevated outline-none"
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
        <span><kbd class="font-mono">↵</kbd> open</span>
        <span><kbd class="font-mono">/</kbd> commands</span>
        <span><kbd class="font-mono">esc</kbd> close</span>
      </div>
    </div>
  </Modal>
</template>
