import { defineHandler } from "void";
import { searchCatalog } from "../../../src/services/media-catalog";

export const GET = defineHandler(async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const limitInput = Number.parseInt(c.req.query("limit") ?? "20", 10);
  const limit = Number.isFinite(limitInput) ? limitInput : 20;

  if (!q) {
    return c.json({ error: "q is required" }, 400);
  }

  try {
    return await searchCatalog({ query: q, limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return c.json({ error: message }, 502);
  }
});
