<template>
  <header class="sticky top-0 z-50 border-b border-border">
    <div class="absolute inset-0 bg-bg/80 backdrop-blur-md" />
    <nav class="relative container min-h-14 flex items-center justify-between z-1">
      <NuxtLink to="/" class="font-mono text-sm sm:text-base text-fg hover:text-accent transition-colors">
        movie
      </NuxtLink>
      <div class="inline-flex items-center gap-2">
        <LinkBase to="/library" variant="button-secondary" size="sm">library</LinkBase>
        <LinkBase to="/settings" variant="button-secondary" size="sm">settings</LinkBase>
      </div>
    </nav>
  </header>
</template>
