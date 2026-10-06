import { fileURLToPath } from "node:url";
import { voidVue } from "@void/vue/plugin";
import { defineConfig, lazyPlugins } from "vite-plus";
import { voidPlugin } from "void";
import UnoCSS from "unocss/vite";

export default defineConfig({
  // `@/*` -> src/* mirrors the tsconfig path alias for the bundler. voidPlugin
  // already wires `@schema`; this covers the rest of the app source.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Vitest 5 cannot attach a second server to Void's worker and page plugins.
      // Unit tests do not load route modules, so they only need the schema alias.
      ...(process.env.VITEST
        ? { "@schema": fileURLToPath(new URL("./db/schema.ts", import.meta.url)) }
        : {}),
    },
  },
  fmt: {
    ignorePatterns: [],
  },
  plugins: lazyPlugins(() => (process.env.VITEST ? [] : [voidPlugin(), UnoCSS(), ...voidVue()])),
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["unicorn", "typescript", "oxc", "vue", "vitest"],
    jsPlugins: ["@e18e/eslint-plugin", "eslint-plugin-regexp"],
    rules: {
      "no-console": "warn",
      "typescript/consistent-type-imports": "error",
      "regexp/no-invalid-regexp": "error",
      "regexp/no-useless-escape": "warn",
    },
    overrides: [
      {
        files: ["routes/**/*", "db/**/*", "src/**/*"],
        rules: {
          "no-console": "off",
        },
      },
    ],
    ignorePatterns: [
      "scripts/**",
      ".output/**",
      ".data/**",
      ".void/**",
      ".cache/**",
      "dist/**",
      "node_modules/**",
    ],
  },
  /*
  server: {
    allowedHosts: [".taila2cbc1.ts.net"],
  },
  */
});
