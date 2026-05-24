<script setup lang="ts">
import "../src/styles/app.css";
import { Link } from "@void/vue";
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="app-header">
      <div class="container app-header-inner">
        <Link class="brand" to="/">movie tracker</Link>
        <nav class="app-nav">
          <Link to="/">Catalog</Link>
          <Link to="/library">Library</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/login">Login</Link>
        </nav>
      </div>
    </header>
    <main id="main-content" class="container page-content" tabindex="-1">
      <slot />
    </main>
    <footer class="app-footer">
      <div class="container app-footer-inner">track on void + vite+</div>
    </footer>
  </div>
</template>
