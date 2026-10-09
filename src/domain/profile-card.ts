import type { MediaRecord } from "@/domain/catalog/media";
import { formatScore, type RatingSystem } from "@/domain/rating";
import type { ProfileIdentity } from "@/domain/user";
import type { AvatarColor } from "@/shared/types/identity";
import type { ProfileActivity, ProfileStats } from "@/domain/insights/profile";

// The card is public. It carries scores already formatted for the viewer and
// no rating system, so the owner's setting has nowhere to travel.
export type ProfileCardModel = {
  identity: {
    displayName: string;
    username: string;
    avatarEmoji: string | null;
    avatarColor: AvatarColor | null;
    joinedAt: number;
  };
  averageScore: string | null;
  stats: ProfileStats;
  activity: ProfileActivity;
  favorites: {
    media: { mediaId: string; media: MediaRecord }[];
    people: { personId: string; name: string; slug: string; profilePath: string | null }[];
  };
};

export function buildProfileCard(input: {
  profile: ProfileIdentity;
  viewerRatingSystem: RatingSystem;
  stats: ProfileStats;
  activity: ProfileActivity;
  favorites: ProfileCardModel["favorites"];
}): ProfileCardModel {
  const { profile, viewerRatingSystem, stats, activity, favorites } = input;

  return {
    identity: {
      displayName: profile.displayName,
      username: profile.username,
      avatarEmoji: profile.avatarEmoji,
      avatarColor: profile.avatarColor,
      joinedAt: profile.joinedAt,
    },
    averageScore:
      stats.averageScore100 === null
        ? null
        : formatScore(stats.averageScore100, viewerRatingSystem),
    stats,
    activity,
    favorites,
  };
}
