import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { profileRecapPage } from "@/read-models/profile-recap-page";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const page = await profileRecapPage({
    username: c.req.param("username"),
    year: c.req.param("year"),
    viewerId: getUser()?.id ?? null,
  });
  return page.kind === "not_found" ? c.notFound() : page;
});
