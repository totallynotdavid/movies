import { defineHandler } from "void";
import { eq } from "drizzle-orm";
import { db } from "void/db";
import { media } from "../../../db/schema";

export const GET = defineHandler(async (c) => {
  const slug = c.req.query("slug");
  if (!slug) return c.json({ error: "slug required" }, 400);

  const rows = await db.select().from(media).where(eq(media.slug, slug)).limit(1);
  const item = rows[0];
  if (!item) return c.json({ error: "not found" }, 404);

  return c.json(item);
});
