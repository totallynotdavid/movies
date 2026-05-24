<script setup lang="ts">
import type { Props } from "./settings.server";

defineProps<Props>();
</script>

<template>
  <section class="stack">
    <h1>settings</h1>
    <div class="card">
      <p class="card-muted">email</p>
      <p>{{ user.email }}</p>
    </div>
    <div class="card">
      <p class="card-muted">role</p>
      <p>{{ role }}</p>
    </div>
  </section>
</template>
