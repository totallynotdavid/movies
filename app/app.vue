<script setup lang="ts">
import { onKeyDown } from '@vueuse/core'
import { isEditableElement } from '~/utils/input'

const route = useRoute()
const keyboardShortcuts = useKeyboardShortcuts()

const darkMode = usePreferredDark()
const colorMode = useColorMode()
const colorScheme = computed(() => {
  return {
    system: darkMode.value ? 'dark light' : 'light dark',
    light: 'only light',
    dark: 'only dark',
  }[colorMode.preference]
})

useHead({
  meta: [{ name: 'color-scheme', content: colorScheme }],
  titleTemplate: chunk => (chunk ? `${chunk} - Movie Tracker` : 'Movie Tracker'),
})

onKeyDown('/', (e) => {
  if (!keyboardShortcuts.value || isEditableElement(e.target)) return
  e.preventDefault()
  const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[name="q"]')
  if (searchInput) {
    searchInput.focus()
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-fg">
    <LinkBase to="#main-content" variant="button-primary" class="skip-link">skip to content</LinkBase>
    <AppHeader />
    <NuxtRouteAnnouncer v-slot="{ message }">{{ route.name === 'index' ? 'home - movie tracker' : message }}</NuxtRouteAnnouncer>
    <main id="main-content" class="flex-1 flex flex-col" tabindex="-1">
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.skip-link {
  position: fixed;
  top: -100%;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
</style>
