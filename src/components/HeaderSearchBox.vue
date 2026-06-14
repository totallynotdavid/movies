<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "@void/vue";
import Input from "@/components/ui/Input.vue";

withDefaults(
  defineProps<{
    inputClass?: string;
  }>(),
  {
    inputClass: "inline sm:block",
  },
);

const emit = defineEmits<{
  focus: [];
  blur: [];
}>();

const router = useRouter();
const query = ref("");
const inputRef = ref<InstanceType<typeof Input> | null>(null);
const focused = ref(false);
const hasQuery = computed(() => query.value.trim().length > 0);

function handleSubmit() {
  const q = query.value.trim();
  void router.visit(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
}

function clearSearch() {
  query.value = "";
  inputRef.value?.focus();
}

function handleFocus() {
  focused.value = true;
  emit("focus");
}

function handleBlur() {
  focused.value = false;
  emit("blur");
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<template>
  <div role="search" :class="`flex-1 sm:max-w-md ${inputClass}`">
    <form method="GET" action="/search" class="relative" @submit.prevent="handleSubmit">
      <label for="header-search" class="sr-only">search titles</label>

      <div class="relative group" :class="{ 'is-focused': focused }">
        <div class="search-box relative flex items-center">
          <kbd
            class="absolute inset-is-3 text-fg-subtle font-mono text-sm pointer-events-none transition-colors duration-200 motion-reduce:transition-none [.group:hover:not(:focus-within)_&]:text-fg/80 group-focus-within:text-accent z-1 rounded"
            data-kbd-hint
            aria-hidden="true"
          >
            /
          </kbd>

          <Input
            id="header-search"
            ref="inputRef"
            v-model="query"
            type="search"
            name="q"
            placeholder="search titles..."
            class="w-full min-w-25 ps-7 pe-8"
            size="sm"
            aria-keyshortcuts="/"
            @focus="handleFocus"
            @blur="handleBlur"
          />

          <button
            v-if="hasQuery"
            type="button"
            class="absolute inset-ie-2 h-6 w-6 items-center justify-center rounded text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group-focus-within:flex group-hover:inline-flex hidden"
            aria-label="clear search"
            tabindex="-1"
            @click="clearSearch"
          >
            <span class="i-lucide:circle-x h-4 w-4" aria-hidden="true" />
          </button>
          <button type="submit" class="sr-only">search</button>
        </div>
      </div>
    </form>
  </div>
</template>
