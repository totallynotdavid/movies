import { defineHandler } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { profilePage } from "@/read-models/profile-page";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const page = await profilePage({
    username: c.req.param("username"),
    viewerId: getUser()?.id ?? null,
  });
  return page.kind === "not_found" ? c.notFound() : page;
});
