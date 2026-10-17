import { ref, watch, type Ref } from "vue";

// Persist view preferences locally when they do not belong in the URL.
export function usePersistentRef(key: string, fallback: string): Ref<string> {
  const value = ref(fallback);
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) value.value = stored;
    watch(value, (next) => window.localStorage.setItem(key, next));
  }
  return value;
}
