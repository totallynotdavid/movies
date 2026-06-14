import { ref, watch, type Ref } from "vue";

// A string ref backed by localStorage. For view preferences that should outlive a
// page visit but do not belong in the URL (a user's default library filters), so
// the system remembers them instead of asking the user to re-pick every time.
export function usePersistentRef(key: string, fallback: string): Ref<string> {
  const value = ref(fallback);
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) value.value = stored;
    watch(value, (next) => window.localStorage.setItem(key, next));
  }
  return value;
}
