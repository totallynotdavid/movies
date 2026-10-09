import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { favoriteMediaForUser, favoritePeopleForUser } from "@/domain/tracking/favorites";
import { wrappedYearsForUser } from "@/domain/insights/wrapped";
import { listWatchHistory } from "@/domain/tracking/watch-history";
import { findProfileByUsername, getUserSettings, type ProfileIdentity } from "@/domain/user";
import type { RatingSystem } from "@/domain/rating";
import { profilePage } from "./profile-page";

vi.mock("@/domain/user", () => ({
  findProfileByUsername: vi.fn<typeof findProfileByUsername>(),
  getUserSettings: vi.fn<typeof getUserSettings>(),
}));
vi.mock("@/domain/tracking/library-entries", () => ({
  entriesWithProgress: vi.fn<typeof entriesWithProgress>(),
}));
vi.mock("@/domain/tracking/watch-history", () => ({
  listWatchHistory: vi.fn<typeof listWatchHistory>(),
}));
vi.mock("@/domain/tracking/favorites", () => ({
  favoriteMediaForUser: vi.fn<typeof favoriteMediaForUser>(),
  favoritePeopleForUser: vi.fn<typeof favoritePeopleForUser>(),
}));
vi.mock("@/domain/insights/wrapped", () => ({
  wrappedYearsForUser: vi.fn<typeof wrappedYearsForUser>(),
}));

const owner: ProfileIdentity = {
  id: "owner-1",
  username: "owner",
  displayName: "Owner",
  avatarEmoji: null,
  avatarColor: null,
  joinedAt: 0,
  timeZone: "UTC",
  visibility: "public",
};

const systems: Record<string, RatingSystem> = {
  "owner-1": "score10",
  "viewer-1": "score5",
};

// Every rated entry is 80/100: "4/5" for the viewer, "8/10" for the owner.
const ratedEntries = [{ media: { mediaType: "movie" }, score100: 80 }] as Awaited<
  ReturnType<typeof entriesWithProgress>
>;

async function viewProfile(viewerId: string | null) {
  return profilePage({
    username: "owner",
    viewerId,
    today: new Date("2026-06-15T12:00:00Z"),
  });
}

describe("profilePage rating system", () => {
  beforeEach(() => {
    vi.mocked(findProfileByUsername).mockResolvedValue(owner);
    vi.mocked(getUserSettings).mockImplementation(async (userId) => ({
      ratingSystem: systems[userId] ?? "score100",
      timeZone: null,
    }));
    vi.mocked(entriesWithProgress).mockResolvedValue(ratedEntries);
    vi.mocked(listWatchHistory).mockResolvedValue([]);
    vi.mocked(favoriteMediaForUser).mockResolvedValue([]);
    vi.mocked(favoritePeopleForUser).mockResolvedValue([]);
    vi.mocked(wrappedYearsForUser).mockResolvedValue([]);
  });

  it("formats the average in the viewer's system and never carries the owner's", async () => {
    const page = await viewProfile("viewer-1");
    const payload = JSON.stringify(page);

    expect(payload).not.toContain("score10");
    expect(payload).not.toContain("8/10");
    expect(page).toMatchObject({ kind: "profile", card: { averageScore: "4/5" } });
  });

  it("formats the average in the default system for an anonymous viewer", async () => {
    const page = await viewProfile(null);

    expect(JSON.stringify(page)).not.toContain("score10");
    expect(page).toMatchObject({ card: { averageScore: "80/100" } });
  });

  it("shows the owner their own system", async () => {
    const page = await viewProfile("owner-1");

    expect(page).toMatchObject({ viewer: { owner: true }, card: { averageScore: "8/10" } });
  });

  it("does not read the owner's settings for another viewer", async () => {
    await viewProfile("viewer-1");

    expect(vi.mocked(getUserSettings)).not.toHaveBeenCalledWith("owner-1");
  });
});
