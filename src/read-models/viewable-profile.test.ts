import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ProfileIdentity } from "@/domain/user";
import { findProfileByUsername } from "@/domain/user";
import { findViewableProfile } from "./viewable-profile";

vi.mock("@/domain/user", () => ({
  findProfileByUsername: vi.fn<typeof findProfileByUsername>(),
}));

const findProfileByUsernameMock = vi.mocked(findProfileByUsername);

function profile(visibility: ProfileIdentity["visibility"]): ProfileIdentity {
  return {
    id: "user-1",
    username: "dubu",
    displayName: "Dubu",
    avatarEmoji: null,
    avatarColor: null,
    joinedAt: 0,
    timeZone: "UTC",
    visibility,
  };
}

describe("findViewableProfile", () => {
  beforeEach(() => {
    findProfileByUsernameMock.mockReset();
  });

  it("does not look up a missing username", async () => {
    await expect(findViewableProfile(undefined, null)).resolves.toBeNull();
    expect(findProfileByUsernameMock).not.toHaveBeenCalled();
  });

  it.each([
    { visibility: "public", viewerId: null, owner: false },
    { visibility: "private", viewerId: "user-1", owner: true },
    { visibility: "private", viewerId: "someone-else", owner: null },
    { visibility: "private", viewerId: null, owner: null },
  ] as const)(
    "$visibility profile for viewer $viewerId",
    async ({ visibility, viewerId, owner }) => {
      const found = profile(visibility);
      findProfileByUsernameMock.mockResolvedValue(found);

      await expect(findViewableProfile("dubu", viewerId)).resolves.toEqual(
        owner === null ? null : { profile: found, owner },
      );
    },
  );
});
