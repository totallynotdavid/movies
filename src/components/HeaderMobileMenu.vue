<script setup lang="ts">
import { watch, onUnmounted } from "vue";
import { Link, useRouter } from "@void/vue";
import { auth } from "void/client";

const isOpen = defineModel<boolean>("open", { default: false });
const props = defineProps<{
  user: { id: string; name: string; email: string; username?: string | null } | null;
}>();

const emit = defineEmits<{
  openPalette: [];
}>();

const router = useRouter();

function closeMenu() {
  isOpen.value = false;
}

function openPalette() {
  closeMenu();
  emit("openPalette");
}

async function signOut() {
  await auth.signOut();
  closeMenu();
  await router.visit("/login");
}

watch(isOpen, (open) => {
  document.documentElement.style.overflow = open ? "hidden" : "";
});

onUnmounted(() => {
  document.documentElement.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[60] sm:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="menu"
        @keydown.escape="closeMenu"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/60 cursor-default"
          aria-label="close menu"
          @click="closeMenu"
        />

        <Transition
          enter-active-class="transition-transform duration-200"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-200"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <nav
            v-if="isOpen"
            class="absolute inset-ie-0 top-0 bottom-0 w-72 bg-bg border-is border-border shadow-xl flex flex-col"
            aria-label="mobile navigation"
          >
            <div class="flex items-center justify-between p-4 border-b border-border">
              <span class="font-mono text-sm text-fg-muted">menu</span>
              <button
                type="button"
                class="p-2 -m-2 text-fg-subtle hover:text-fg transition-colors duration-200 focus-visible:outline-accent/70 rounded"
                aria-label="close menu"
                @click="closeMenu"
              >
                <span class="i-lucide:x w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div class="px-2 py-2">
              <span
                class="px-3 py-2 block font-mono text-xs text-fg-subtle uppercase tracking-wider"
              >
                account
              </span>
              <template v-if="props.user">
                <Link
                  v-if="props.user.username"
                  :href="`/u/${props.user.username}`"
                  class="w-full flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200"
                  @click="closeMenu"
                >
                  <span class="w-5 h-5 rounded-full bg-bg-muted flex items-center justify-center">
                    <span class="i-lucide:user w-3 h-3 text-fg-muted" aria-hidden="true" />
                  </span>
                  <span class="flex-1">{{ props.user.name }}</span>
                </Link>
                <Link
                  href="/settings"
                  class="w-full flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200"
                  @click="closeMenu"
                >
                  <span class="w-5 h-5 rounded-full bg-bg-muted flex items-center justify-center">
                    <span class="i-lucide:settings w-3 h-3 text-fg-muted" aria-hidden="true" />
                  </span>
                  <span class="flex-1">settings</span>
                </Link>
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200 text-start"
                  @click="signOut"
                >
                  <span class="w-5 h-5 rounded-full bg-bg-muted flex items-center justify-center">
                    <span class="i-lucide:log-out w-3 h-3 text-fg-muted" aria-hidden="true" />
                  </span>
                  <span class="flex-1">sign out</span>
                </button>
              </template>
              <Link
                v-else
                href="/login"
                class="w-full flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200"
                @click="closeMenu"
              >
                <span class="w-5 h-5 rounded-full bg-bg-muted flex items-center justify-center">
                  <span class="i-lucide:log-in w-3 h-3 text-fg-muted" aria-hidden="true" />
                </span>
                <span class="flex-1">sign in</span>
              </Link>
            </div>

            <div class="px-2 py-2">
              <span
                class="px-3 py-2 block font-mono text-xs text-fg-subtle uppercase tracking-wider"
              >
                actions
              </span>
              <button
                type="button"
                class="w-full flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200 text-start"
                @click="openPalette"
              >
                <span class="w-5 h-5 rounded-full bg-bg-muted flex items-center justify-center">
                  <span class="i-lucide:command w-3 h-3 text-fg-muted" aria-hidden="true" />
                </span>
                <span class="flex-1">quick actions</span>
              </button>
            </div>

            <div class="mx-4 my-2 border-t border-border" />

            <div class="flex-1 overflow-y-auto overscroll-contain py-2">
              <div class="p-2">
                <span class="px-3 py-2 font-mono text-xs text-fg-subtle uppercase tracking-wider">
                  navigation
                </span>
                <div>
                  <Link
                    href="/"
                    class="flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200"
                    @click="closeMenu"
                  >
                    <span class="i-lucide:home w-5 h-5 text-fg-muted" aria-hidden="true" />
                    home
                  </Link>
                  <Link
                    href="/search"
                    class="flex items-center gap-3 px-3 py-3 rounded-md font-mono text-sm text-fg hover:bg-bg-subtle transition-colors duration-200"
                    @click="closeMenu"
                  >
                    <span class="i-lucide:search w-5 h-5 text-fg-muted" aria-hidden="true" />
                    search
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
