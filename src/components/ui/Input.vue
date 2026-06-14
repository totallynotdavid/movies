<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  type?: "text" | "search" | "email" | "password";
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  minlength?: number;
  autofocus?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  ariaKeyshortcuts?: string;
}>();

const model = defineModel<string>();
const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<template>
  <input
    ref="inputRef"
    :id="id"
    v-model="model"
    :type="type ?? 'text'"
    :name="name"
    :placeholder="placeholder"
    :required="required"
    :minlength="minlength"
    :autofocus="autofocus"
    :disabled="disabled ? true : undefined"
    class="appearance-none bg-bg-subtle border border-border font-mono text-fg placeholder:text-fg-subtle transition-[border-color,outline-color] duration-300 hover:border-fg-subtle outline-2 outline-transparent outline-offset-2 focus:border-accent focus-visible:outline-accent/70 disabled:(opacity-50 cursor-not-allowed)"
    :class="{
      'text-xs leading-[1.2] px-2 py-2 rounded-md': (size ?? 'md') === 'sm',
      'text-sm leading-none px-3 py-2.5 rounded-lg': (size ?? 'md') === 'md',
      'text-base leading-[1.4] px-6 py-4 rounded-xl': size === 'lg',
    }"
    :aria-keyshortcuts="ariaKeyshortcuts"
  />
</template>
