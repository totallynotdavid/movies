import { defineHandler } from "void";
import type { InferProps } from "void";
import { ensureMediaDetails } from "@/services/media-hydration";
import { findMediaBySlug } from "@/domain/catalog/media";
import { groupByDepartment, listAllCrew } from "@/domain/catalog/credits";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const found = await findMediaBySlug(slug);
  if (!found) return c.notFound();

  // Direct visits use the same hydration contract as the detail page.
  const item = await ensureMediaDetails(found);
  const crewGroups = groupByDepartment(await listAllCrew(item.id));

  return {
    media: { title: item.title, slug: item.slug, mediaType: item.mediaType },
    crewGroups,
  };
});
