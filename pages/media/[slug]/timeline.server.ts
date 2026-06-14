import { defineHandler } from "void";
import type { InferProps } from "void";
import { getTimelineView } from "@/domain/tracking/media-timeline";
import { loadMedia } from "@/services/media-hydration";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const item = await loadMedia(c.req.param("slug") as string);
  if (!item) return c.notFound();

  const timeline = await getTimelineView(item.id);
  return { media: item, timeline };
});
