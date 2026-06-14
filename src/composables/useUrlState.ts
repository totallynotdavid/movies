import { onMounted, watch, type Ref } from "vue";

// The single owner of "this view's state lives in the URL". It seeds the given
// string refs from the current query string on mount and mirrors later changes
// back with replaceState (no navigation), so a refresh or a shared link restores
// the exact filters/sort the user was looking at. Values equal to a declared
// default are omitted to keep the URL clean.
export function useUrlState(
  state: Record<string, Ref<string>>,
  defaults: Record<string, string> = {},
) {
  function readFromUrl() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    for (const [key, ref] of Object.entries(state)) {
      const value = params.get(key);
      if (value !== null) ref.value = value;
    }
  }

  function writeToUrl() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    for (const [key, ref] of Object.entries(state)) {
      const value = ref.value;
      if (value && value !== defaults[key]) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `?${qs}` : window.location.pathname);
  }

  onMounted(() => {
    readFromUrl();
    watch(Object.values(state), writeToUrl);
  });

  return { writeToUrl };
}
