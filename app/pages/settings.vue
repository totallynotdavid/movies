<script setup lang="ts">
const colorMode = useColorMode()
</script>

<template>
  <section class="container py-8 sm:py-12 max-w-2xl">
    <h1 class="text-2xl font-mono mb-6">settings</h1>
    <div class="bg-bg-subtle border border-border rounded-lg p-4">
      <label class="text-sm font-mono text-fg-muted block mb-2" for="theme">theme</label>
      <SelectField
        id="theme"
        v-model="colorMode.preference"
        :items="[
          { label: 'System', value: 'system' },
          { label: 'Dark', value: 'dark' },
          { label: 'Light', value: 'light' }
        ]"
      />
    </div>
  </section>
</template>
