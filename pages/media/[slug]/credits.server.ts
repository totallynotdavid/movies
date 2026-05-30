import { defineHandler } from "void";
import type { InferProps } from "void";
import { ensureMediaDetails } from "../../../src/services/media-hydration";
import { findMediaBySlug } from "../../../src/domain/media";
import { groupByDepartment, listAllCrew, listCast } from "../../../src/domain/credits";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const slug = c.req.param("slug") as string;
  const found = await findMediaBySlug(slug);
  if (!found) return c.notFound();

  // Self-sufficient if reached directly: same state-keyed hydration as the
  // detail page, with the service owning the failure model.
  const item = await ensureMediaDetails(found);

  const [cast, crew] = await Promise.all([listCast(item.id, item.mediaType), listAllCrew(item.id)]);

  return {
    media: { title: item.title, slug: item.slug, mediaType: item.mediaType },
    cast,
    crewGroups: groupByDepartment(crew),
  };
});
