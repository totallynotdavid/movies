import { defineConfig } from "void/config";

export default defineConfig({
  auth: {
    providers: ["email"],
  },
  inference: {
    appType: "void",
    bindings: {
      db: true,
      kv: false,
      storage: false,
      ai: false,
    },
  },
  worker: {
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat", "nodejs_als"],
  },
  cloudflare: {
    name: "track",
    compatibility_date: "2026-02-24",
    d1_databases: [
      {
        binding: "DB",
        database_name: "default",
        database_id: "local",
      },
    ],
    kv_namespaces: [
      {
        binding: "KV",
        id: "local",
      },
    ],
  },
});
