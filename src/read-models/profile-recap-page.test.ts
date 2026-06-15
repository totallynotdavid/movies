import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfileIdentity } from "@/domain/user";
import { getWrappedSummary, wrappedYearsForUser } from "@/domain/insights/wrapped";
import { findViewableProfile } from "./viewable-profile";
import { profileRecapPage } from "./profile-recap-page";

vi.mock("@/domain/insights/wrapped", () => ({
  getWrappedSummary: vi.fn<typeof getWrappedSummary>(),
  wrappedYearsForUser: vi.fn<typeof wrappedYearsForUser>(),
}));

vi.mock("./viewable-profile", () => ({
  findViewableProfile: vi.fn<typeof findViewableProfile>(),
}));

const findViewableProfileMock = vi.mocked(findViewableProfile);
const wrappedYearsForUserMock = vi.mocked(wrappedYearsForUser);
const getWrappedSummaryMock = vi.mocked(getWrappedSummary);

const profile: ProfileIdentity = {
  id: "user-1",
  username: "dubu",
  displayName: "Dubu",
  avatarEmoji: null,
  avatarColor: null,
  joinedAt: 0,
  timeZone: "UTC",
  visibility: "public",
};

describe("profileRecapPage", () => {
  beforeEach(() => {
    findViewableProfileMock.mockReset();
    wrappedYearsForUserMock.mockReset();
    getWrappedSummaryMock.mockReset();
  });

  it("returns not_found when the profile is not viewable", async () => {
    findViewableProfileMock.mockResolvedValue(null);

    await expect(
      profileRecapPage({ username: "dubu", year: "2026", viewerId: null }),
    ).resolves.toEqual({ kind: "not_found" });
  });

  it("returns not_found for invalid years", async () => {
    findViewableProfileMock.mockResolvedValue({ profile, owner: false });

    await expect(
      profileRecapPage({ username: "dubu", year: "nope", viewerId: null }),
    ).resolves.toEqual({ kind: "not_found" });
  });

  it("returns locked current-year recaps for visitors before December", async () => {
    findViewableProfileMock.mockResolvedValue({ profile, owner: false });
    wrappedYearsForUserMock.mockResolvedValue([2025]);

    await expect(
      profileRecapPage({
        username: "dubu",
        year: "2026",
        viewerId: null,
        today: new Date("2026-06-15T12:00:00Z"),
      }),
    ).resolves.toMatchObject({
      kind: "recap",
      recapAccess: "locked",
      wrapped: null,
    });
    expect(getWrappedSummaryMock).not.toHaveBeenCalled();
  });

  it("loads wrapped data for open years", async () => {
    findViewableProfileMock.mockResolvedValue({ profile, owner: false });
    wrappedYearsForUserMock.mockResolvedValue([2025]);
    getWrappedSummaryMock.mockResolvedValue({ year: 2025 } as Awaited<
      ReturnType<typeof getWrappedSummary>
    >);

    await expect(
      profileRecapPage({
        username: "dubu",
        year: "2025",
        viewerId: null,
        today: new Date("2026-06-15T12:00:00Z"),
      }),
    ).resolves.toMatchObject({
      kind: "recap",
      recapAccess: "open",
      wrapped: { year: 2025 },
    });
    expect(getWrappedSummaryMock).toHaveBeenCalledWith("user-1", { year: 2025 });
  });

  it("returns not_found for future activity years", async () => {
    findViewableProfileMock.mockResolvedValue({ profile, owner: false });
    wrappedYearsForUserMock.mockResolvedValue([2027, 2025]);

    await expect(
      profileRecapPage({
        username: "dubu",
        year: "2027",
        viewerId: null,
        today: new Date("2026-06-15T12:00:00Z"),
      }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(getWrappedSummaryMock).not.toHaveBeenCalled();
  });
});
