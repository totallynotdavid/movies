import { defineHandler } from "void";
import type { InferProps } from "void";
import { listMedia } from "@/domain/catalog/media";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const entries = await listMedia({ limit: 24 });
  return { entries };
});
