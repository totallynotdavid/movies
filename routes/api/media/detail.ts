import { defineHandler } from "void";
import { findMediaBySlug } from "@/domain/catalog/media";

export const GET = defineHandler(async (c) => {
  const slug = c.req.query("slug");
  if (!slug) return c.json({ error: "slug required" }, 400);

  const item = await findMediaBySlug(slug);
  if (!item) return c.json({ error: "not found" }, 404);

  c.header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return c.json(item);
});
