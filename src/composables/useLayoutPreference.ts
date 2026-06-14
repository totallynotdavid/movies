// Persisted media collection layout preference shared by home and search.
// Defaults to grid when no preference is stored.

import { onMounted, ref, watch } from "vue";

export type MediaLayout = "grid" | "list";

const STORAGE_KEY = "track-media-layout";

export function useLayoutPreference(defaultLayout: MediaLayout = "grid") {
  const layout = ref<MediaLayout>(defaultLayout);

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grid" || stored === "list") layout.value = stored;
  });

  watch(layout, (next) => localStorage.setItem(STORAGE_KEY, next));

  return { layout };
}
