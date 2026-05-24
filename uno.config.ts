import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "forced-color-adjust": "preserve-parent-color",
      },
      warn: true,
      scale: 1.2,
    }),
    presetTypography(),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    font: {
      mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      sans: "'IBM Plex Sans', 'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    colors: {
      bg: {
        DEFAULT: "var(--bg)",
        subtle: "var(--bg-subtle)",
        muted: "var(--bg-muted)",
        elevated: "var(--bg-elevated)",
      },
      fg: {
        DEFAULT: "var(--fg)",
        muted: "var(--fg-muted)",
        subtle: "var(--fg-subtle)",
      },
      border: {
        DEFAULT: "var(--border)",
        hover: "var(--border-hover)",
      },
      accent: {
        DEFAULT: "var(--accent)",
      },
      status: {
        planned: "var(--status-planned)",
        watching: "var(--status-watching)",
        completed: "var(--status-completed)",
        paused: "var(--status-paused)",
        dropped: "var(--status-dropped)",
      },
    },
    animation: {
      keyframes: {
        "skeleton-pulse": "{0%, 100% { opacity: 0.4 } 50% { opacity: 0.7 }}",
        "fade-in": "{from { opacity: 0 } to { opacity: 1 }}",
        "slide-up":
          "{from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) }}",
        "scale-in":
          "{from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) }}",
      },
      durations: {
        "skeleton-pulse": "2s",
        "fade-in": "0.3s",
        "slide-up": "0.4s",
        "scale-in": "0.2s",
      },
      timingFns: {
        "skeleton-pulse": "ease-in-out",
        "fade-in": "ease-out",
        "slide-up": "cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      counts: {
        "skeleton-pulse": "infinite",
      },
    },
  },
  shortcuts: [
    ["container", "max-w-6xl mx-auto px-4 sm:px-6"],
    ["focus-ring", "outline-none focus-visible:(ring-2 ring-fg/50 ring-offset-2 ring-offset-bg)"],
    ["link-subtle", "text-fg-muted hover:text-fg transition-colors duration-200 focus-ring"],
    ["badge-planned", "bg-blue-500/10 text-blue-400 border-blue-500/20"],
    ["badge-watching", "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"],
    ["badge-completed", "bg-green-500/10 text-green-400 border-green-500/20"],
    ["badge-paused", "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"],
    ["badge-dropped", "bg-red-500/10 text-red-400 border-red-500/20"],
  ],
});
