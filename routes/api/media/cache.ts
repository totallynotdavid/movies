import { defineHandler } from "void";
import { cacheMediaSelection } from "@/services/media-catalog";

export const POST = defineHandler(async (c) => {
  try {
    const body = await c.req.json();
    const result = await cacheMediaSelection(body);
    return c.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cache media";
    return c.json({ error: message }, 400);
  }
});
