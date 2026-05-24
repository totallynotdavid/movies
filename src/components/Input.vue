<script setup lang="ts">
defineProps<{
  type?: "text" | "search" | "email" | "password";
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  minlength?: number;
  autofocus?: boolean;
}>();

const model = defineModel<string>();
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type ?? 'text'"
    :name="name"
    :placeholder="placeholder"
    :required="required"
    :minlength="minlength"
    :autofocus="autofocus"
    class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono w-full"
  />
</template>
