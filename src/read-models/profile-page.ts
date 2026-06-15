import { genresByMedia } from "@/domain/catalog/metadata";
import { buildMirror, type Mirror } from "@/domain/insights/mirror";
import { buildProfileActivity } from "@/domain/insights/profile";
import { wrappedYearsForUser } from "@/domain/insights/wrapped";
import { buildProfileCard, type ProfileCardModel } from "@/domain/profile-card";
import { buildRecapYears, type RecapYear } from "@/domain/recaps";
import { favoriteMediaForUser, favoritePeopleForUser } from "@/domain/tracking/favorites";
import { entriesWithProgress } from "@/domain/tracking/library-entries";
import { listWatchHistory } from "@/domain/tracking/watch-history";
import { getUserSettings } from "@/domain/user";
import { findViewableProfile } from "./viewable-profile";

export type ProfilePageModel =
  | { kind: "not_found" }
  | {
      kind: "profile";
      viewer: { owner: boolean };
      isPrivate: boolean;
      card: ProfileCardModel;
      insights: Mirror | null;
      recapYears: RecapYear[];
    };

export async function profilePage(input: {
  username: string | undefined;
  viewerId: string | null;
  today?: Date;
}): Promise<ProfilePageModel> {
  const visible = await findViewableProfile(input.username, input.viewerId);
  if (!visible) return { kind: "not_found" };

  const { profile, owner } = visible;
  const today = input.today ?? new Date();

  const [settings, history, entries, favoriteMedia, favoritePeople, activityYears] =
    await Promise.all([
      getUserSettings(profile.id),
      listWatchHistory(profile.id),
      entriesWithProgress(profile.id),
      favoriteMediaForUser(profile.id),
      favoritePeopleForUser(profile.id),
      wrappedYearsForUser(profile.id),
    ]);

  const library = entries.map((entry) => ({
    mediaType: entry.media.mediaType,
    score100: entry.score100,
  }));
  const { stats, activity } = buildProfileActivity(library, history, today);
  const recapYears = buildRecapYears({ activityYears, profile, owner, today });
  const insights = owner
    ? buildMirror(history, await genresForHistory(history), entries, today.getTime())
    : null;

  return {
    kind: "profile",
    viewer: { owner },
    isPrivate: profile.visibility !== "public",
    card: buildProfileCard({
      profile,
      ratingSystem: settings.ratingSystem,
      stats,
      activity,
      favorites: { media: favoriteMedia, people: favoritePeople },
    }),
    insights,
    recapYears,
  };
}

async function genresForHistory(history: { mediaId: string }[]): Promise<Map<string, string[]>> {
  const mediaIds = [...new Set(history.map((row) => row.mediaId))];
  return genresByMedia(mediaIds);
}
