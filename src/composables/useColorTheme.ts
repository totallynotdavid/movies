import { ref, watch, onMounted } from "vue";

type Theme = "dark" | "light";
const STORAGE_KEY = "track-theme";

const theme = ref<Theme>("dark");

export function useColorTheme() {
  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      theme.value = stored;
    }
    document.documentElement.setAttribute("data-theme", theme.value);
  });

  watch(theme, (t) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(STORAGE_KEY, t);
  });

  return {
    theme,
    toggle: () => {
      theme.value = theme.value === "dark" ? "light" : "dark";
    },
  };
}
