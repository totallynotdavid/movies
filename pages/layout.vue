<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import "virtual:uno.css";
import "@/styles/app.css";
import { Link, useShared, useRouter } from "@void/vue";
import { auth } from "void/client";
import Avatar from "@/components/identity/Avatar.vue";
import CommandPalette from "@/components/CommandPalette.vue";
import ScrollToTop from "@/components/ui/ScrollToTop.vue";
import IconBtn from "@/components/ui/IconBtn.vue";

const shared = useShared();
const user = shared.user;
const router = useRouter();

const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null);
const navSearchRef = ref<HTMLInputElement | null>(null);
const navQuery = ref("");
const mobileMenuOpen = ref(false);
const userMenuOpen = ref(false);
const shortcutsOpen = ref(false);

// The nav search box routes to the browse page; live searching happens there.
// ⌘K opens the palette for quick navigation and logging.
function goSearch() {
  const q = navQuery.value.trim();
  void router.visit(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  navQuery.value = "";
}

async function signOut() {
  await auth.signOut();
  userMenuOpen.value = false;
  mobileMenuOpen.value = false;
  await router.visit("/login");
}

function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
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
    // "/" focuses the nav search box. ⌘K opens the palette.
    navSearchRef.value?.focus();
    return;
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

    <header class="sticky top-0 z-50 border-b border-border">
      <div class="absolute inset-0 bg-bg/80 backdrop-blur-md" />
      <nav
        class="relative container min-h-14 flex items-center gap-3 z-1"
        aria-label="main navigation"
      >
        <Link
          href="/"
          class="font-mono font-bold text-fg hover:text-accent transition-colors mr-4 shrink-0 focus-ring rounded"
        >
          track
        </Link>

        <form
          role="search"
          class="relative hidden sm:flex items-center flex-1 max-w-xs ml-auto"
          @submit.prevent="goSearch"
        >
          <span
            class="i-lucide:search absolute left-3 w-4 h-4 text-fg-subtle pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref="navSearchRef"
            v-model="navQuery"
            type="search"
            placeholder="search titles..."
            aria-label="search titles"
            class="w-full rounded-md border border-border bg-bg-subtle pl-9 pr-8 py-1.5 text-sm font-mono text-fg placeholder:text-fg-subtle outline-none hover:border-border-hover focus:border-border-hover transition-colors"
          />
          <kbd
            v-if="!navQuery"
            class="absolute right-2.5 font-mono text-xs text-fg-subtle pointer-events-none"
            data-kbd-hint
            >/</kbd
          >
        </form>

        <div class="hidden sm:flex items-center gap-2 shrink-0">
          <Link
            v-if="!user"
            href="/login"
            class="px-3.5 py-2 rounded-md border border-border bg-transparent text-fg text-sm hover:bg-fg/10 transition-colors font-mono focus-ring"
          >
            sign in
          </Link>

          <div v-else class="relative">
            <button
              type="button"
              class="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md border border-border bg-transparent text-fg text-sm hover:bg-fg/10 transition-colors font-mono focus-ring"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
              @click="userMenuOpen = !userMenuOpen"
            >
              <Avatar :emoji="null" :color="null" :name="user.name" :size="24" />
              <span>{{ user.name }}</span>
              <span
                class="i-lucide:chevron-down w-3.5 h-3.5 text-fg-subtle transition-transform duration-200"
                :class="{ 'rotate-180': userMenuOpen }"
                aria-hidden="true"
              />
            </button>

            <div v-if="userMenuOpen" class="fixed inset-0 z-40" @click="userMenuOpen = false" />
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 translate-y-1"
              leave-active-class="transition duration-100 ease-in"
              leave-to-class="opacity-0 translate-y-1"
            >
              <div
                v-if="userMenuOpen"
                class="absolute right-0 mt-2 z-50 w-48 flex flex-col p-1 rounded-lg border border-border bg-bg-subtle shadow-xl"
                role="menu"
              >
                <Link
                  v-if="user.username"
                  :href="`/u/${user.username}`"
                  class="px-3 py-2 rounded-md text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
                  @click="userMenuOpen = false"
                >
                  profile
                </Link>
                <Link
                  href="/settings"
                  class="px-3 py-2 rounded-md text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
                  @click="userMenuOpen = false"
                >
                  settings
                </Link>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md text-left text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
                  @click="signOut"
                >
                  sign out
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <div class="ml-auto sm:hidden flex items-center gap-2">
          <Link
            href="/search"
            class="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-transparent text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors focus-ring"
            aria-label="search"
          >
            <span class="i-lucide:search w-4 h-4" aria-hidden="true" />
          </Link>

          <IconBtn
            :icon="mobileMenuOpen ? 'i-lucide:x' : 'i-lucide:menu'"
            :aria-label="mobileMenuOpen ? 'close menu' : 'open menu'"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          />
        </div>
      </nav>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="mobileMenuOpen"
          class="relative sm:hidden border-t border-border bg-bg-subtle/95 backdrop-blur-md"
        >
          <div class="container py-3 flex flex-col gap-1">
            <template v-if="user">
              <Link
                v-if="user.username"
                :href="`/u/${user.username}`"
                class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
                @click="mobileMenuOpen = false"
              >
                <span class="i-lucide:user w-4 h-4" aria-hidden="true" />
                profile
              </Link>
              <Link
                href="/settings"
                class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
                @click="mobileMenuOpen = false"
              >
                <span class="i-lucide:settings w-4 h-4" aria-hidden="true" />
                settings
              </Link>
              <button
                type="button"
                class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
                @click="signOut"
              >
                <span class="i-lucide:log-out w-4 h-4" aria-hidden="true" />
                sign out
              </button>
            </template>
            <Link
              v-else
              href="/login"
              class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono text-fg-muted hover:bg-fg/10 hover:text-fg transition-colors"
              @click="mobileMenuOpen = false"
            >
              <span class="i-lucide:log-in w-4 h-4" aria-hidden="true" />
              sign in
            </Link>
          </div>
        </div>
      </Transition>
    </header>

    <main id="main-content" class="container flex-1 py-8 sm:py-12" tabindex="-1">
      <slot />
    </main>

    <footer class="border-t border-border mt-12">
      <div class="container min-h-14 flex items-center justify-between text-fg-subtle text-xs">
        <span class="font-mono">track</span>
        <button
          type="button"
          class="hidden sm:flex items-center gap-3 font-mono text-fg-subtle/60 hover:text-fg-subtle transition-colors focus-ring rounded"
          @click="shortcutsOpen = true"
        >
          <span><kbd class="font-mono">?</kbd> hints</span>
          <span aria-hidden="true">·</span>
          <span><kbd class="font-mono">/</kbd> search</span>
          <span aria-hidden="true">·</span>
          <span><kbd class="font-mono">⌘K</kbd> palette</span>
        </button>
        <span class="font-mono">void + vite+</span>
      </div>
    </footer>

    <dialog
      :open="shortcutsOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
      @click.self="shortcutsOpen = false"
      @keydown.escape="shortcutsOpen = false"
    >
      <div
        v-if="shortcutsOpen"
        class="w-full max-w-sm rounded-2xl border border-border bg-bg-subtle shadow-2xl p-6 flex flex-col gap-4 motion-safe:animate-scale-in animate-fill-both"
        @click.stop
      >
        <div class="flex items-center justify-between">
          <h2 class="font-mono text-sm text-fg">keyboard shortcuts</h2>
          <button
            type="button"
            class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-fg/10 text-fg-subtle hover:text-fg transition-colors focus-ring"
            aria-label="close"
            @click="shortcutsOpen = false"
          >
            <span class="i-lucide:x w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        <ul class="flex flex-col gap-2.5">
          <li class="flex items-center justify-between">
            <span class="text-sm text-fg-muted font-mono">command palette</span>
            <kbd
              class="font-mono text-xs px-2 py-0.5 rounded border border-border bg-bg-muted text-fg-subtle"
              >⌘K</kbd
            >
          </li>
          <li class="flex items-center justify-between">
            <span class="text-sm text-fg-muted font-mono">focus search</span>
            <kbd
              class="font-mono text-xs px-2 py-0.5 rounded border border-border bg-bg-muted text-fg-subtle"
              >/</kbd
            >
          </li>
          <li class="flex items-center justify-between">
            <span class="text-sm text-fg-muted font-mono">show hints</span>
            <kbd
              class="font-mono text-xs px-2 py-0.5 rounded border border-border bg-bg-muted text-fg-subtle"
              >?</kbd
            >
          </li>
          <li class="flex items-center justify-between">
            <span class="text-sm text-fg-muted font-mono">navigate results</span>
            <span class="flex gap-1">
              <kbd
                class="font-mono text-xs px-2 py-0.5 rounded border border-border bg-bg-muted text-fg-subtle"
                >↑</kbd
              >
              <kbd
                class="font-mono text-xs px-2 py-0.5 rounded border border-border bg-bg-muted text-fg-subtle"
                >↓</kbd
              >
            </span>
          </li>
          <li class="flex items-center justify-between">
            <span class="text-sm text-fg-muted font-mono">close</span>
            <kbd
              class="font-mono text-xs px-2 py-0.5 rounded border border-border bg-bg-muted text-fg-subtle"
              >esc</kbd
            >
          </li>
        </ul>
      </div>
    </dialog>

    <CommandPalette ref="paletteRef" :user="user" />
    <ScrollToTop />
  </div>
</template>
