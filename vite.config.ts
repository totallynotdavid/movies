import { voidVue } from "@void/vue/plugin";
import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin(), ...voidVue()],
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
      ".output/**",
      ".data/**",
      ".void/**",
      ".cache/**",
      "dist/**",
      "node_modules/**",
    ],
  },
});
