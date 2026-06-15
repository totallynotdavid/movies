import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("returns public profiles for visitors", async () => {
    const publicProfile = profile("public");
    findProfileByUsernameMock.mockResolvedValue(publicProfile);

    await expect(findViewableProfile("dubu", null)).resolves.toEqual({
      profile: publicProfile,
      owner: false,
    });
  });

  it("hides private profiles from visitors", async () => {
    findProfileByUsernameMock.mockResolvedValue(profile("private"));

    await expect(findViewableProfile("dubu", "someone-else")).resolves.toBeNull();
  });

  it("returns private profiles for their owner", async () => {
    const privateProfile = profile("private");
    findProfileByUsernameMock.mockResolvedValue(privateProfile);

    await expect(findViewableProfile("dubu", "user-1")).resolves.toEqual({
      profile: privateProfile,
      owner: true,
    });
  });
});
