import { defineHandler } from "void";
import type { InferProps } from "void";
import { loadMedia } from "@/services/media-hydration";
import { groupByDepartment, listAllCrew } from "@/domain/catalog/credits";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  const crewGroups = groupByDepartment(await listAllCrew(item.id));
  return { media: item, crewGroups };
});
