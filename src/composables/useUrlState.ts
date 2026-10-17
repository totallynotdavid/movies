import { onMounted, watch, type Ref } from "vue";

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
