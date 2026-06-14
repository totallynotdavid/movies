<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { Link, useRouter } from "@void/vue";
import { auth } from "void/client";
import Avatar from "@/components/identity/Avatar.vue";
import Btn from "@/components/ui/Btn.vue";
import HeaderMobileMenu from "@/components/HeaderMobileMenu.vue";
import HeaderSearchBox from "@/components/HeaderSearchBox.vue";

const props = defineProps<{
  user: { id: string; name: string; email: string; username?: string | null } | null;
}>();

const emit = defineEmits<{
  openPalette: [];
}>();

const router = useRouter();
const searchBoxRef = ref<InstanceType<typeof HeaderSearchBox> | null>(null);
const userMenuOpen = ref(false);
const showMobileMenu = ref(false);
const searchExpanded = ref(false);

const userInitial = computed(() => props.user?.name?.charAt(0).toUpperCase() ?? "?");

function openPalette() {
  emit("openPalette");
}

function expandMobileSearch() {
  searchExpanded.value = true;
  nextTick(() => searchBoxRef.value?.focus());
}

function handleSearchBlur() {
  window.setTimeout(() => {
    searchExpanded.value = false;
  }, 150);
}

async function signOut() {
  await auth.signOut();
  userMenuOpen.value = false;
  showMobileMenu.value = false;
  await router.visit("/login");
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border">
    <div class="absolute inset-0 bg-bg/80 backdrop-blur-md" />
    <nav
      class="relative container min-h-14 flex items-center gap-2 z-1 justify-end"
      aria-label="main navigation"
    >
      <Link
        v-if="!searchExpanded"
        href="/"
        class="font-mono text-lg font-medium text-fg hover:text-fg/90 transition-colors duration-200 me-4 shrink-0 focus-ring rounded"
      >
        track
      </Link>

      <Btn
        type="button"
        variant="secondary"
        class="hidden lg:inline-flex shrink-0 gap-2 ps-2.5 pe-1.25 py-1.25! me-3"
        aria-label="open command palette"
        @click="openPalette"
      >
        <span>quick actions</span>
        <span class="inline-flex items-center gap-1 text-xs text-fg-subtle">
          <kbd
            class="inline-flex items-center justify-center rounded border border-border bg-bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-fg-muted"
          >
            ⌘K
          </kbd>
        </span>
      </Btn>

      <div
        class="flex-1 flex items-center md:gap-6"
        :class="{
          'hidden sm:flex': !searchExpanded,
          'justify-center': true,
        }"
      >
        <HeaderSearchBox
          ref="searchBoxRef"
          :input-class="searchExpanded ? 'w-full' : ''"
          :class="{ 'max-w-md': !searchExpanded }"
          @blur="handleSearchBlur"
        />
      </div>

      <div v-if="!searchExpanded" class="hidden sm:flex flex-shrink-0 items-center gap-2">
        <Link
          href="/search"
          class="inline-flex items-center justify-center font-mono border border-transparent rounded-md transition-all duration-200 text-sm px-4 py-2 bg-transparent text-fg hover:(bg-fg/10 text-accent) focus-visible:(bg-fg/10 text-accent)"
        >
          search
        </Link>

        <Link
          v-if="!props.user"
          href="/login"
          class="inline-flex items-center justify-center font-mono border border-transparent rounded-md transition-all duration-200 text-sm px-4 py-2 bg-transparent text-fg hover:(bg-fg/10 text-accent) focus-visible:(bg-fg/10 text-accent)"
        >
          sign in
        </Link>

        <div v-else class="relative">
          <button
            type="button"
            class="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md bg-transparent text-fg text-sm hover:bg-fg/10 transition-all duration-200 font-mono focus-ring"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            @click="userMenuOpen = !userMenuOpen"
          >
            <Avatar :emoji="null" :color="null" :name="props.user.name" :size="24" />
            <span>{{ props.user.name || userInitial }}</span>
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
              class="absolute right-0 mt-2 z-50 w-48 flex flex-col p-1 rounded-lg border border-border-subtle bg-bg-subtle/80 backdrop-blur-sm shadow-lg shadow-bg-elevated/50"
              role="menu"
            >
              <Link
                v-if="props.user.username"
                :href="`/u/${props.user.username}`"
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

      <Btn
        v-if="!searchExpanded"
        type="button"
        class="sm:hidden ms-auto py-2.5!"
        aria-label="search"
        classicon="i-lucide:search"
        @click="expandMobileSearch"
      />

      <Btn
        v-if="!searchExpanded"
        type="button"
        class="sm:hidden py-2.5!"
        aria-label="open menu"
        :aria-expanded="showMobileMenu"
        classicon="i-lucide:menu"
        @click="showMobileMenu = !showMobileMenu"
      />
    </nav>

    <HeaderMobileMenu
      v-model:open="showMobileMenu"
      :user="props.user"
      @open-palette="openPalette"
    />
  </header>
</template>
