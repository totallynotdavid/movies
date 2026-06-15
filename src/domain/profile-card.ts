import type { MediaRecord } from "@/domain/catalog/media";
import type { RatingSystem } from "@/domain/rating";
import type { ProfileIdentity } from "@/domain/user";
import type { AvatarColor } from "@/shared/types/identity";
import type { ProfileActivity, ProfileStats } from "@/domain/insights/profile";

export type ProfileCardModel = {
  identity: {
    displayName: string;
    username: string;
    avatarEmoji: string | null;
    avatarColor: AvatarColor | null;
    joinedAt: number;
  };
  ratingSystem: RatingSystem;
  stats: ProfileStats;
  activity: ProfileActivity;
  favorites: {
    media: { mediaId: string; media: MediaRecord }[];
    people: { personId: string; name: string; slug: string; profilePath: string | null }[];
  };
};

export function buildProfileCard(input: {
  profile: ProfileIdentity;
  ratingSystem: RatingSystem;
  stats: ProfileStats;
  activity: ProfileActivity;
  favorites: ProfileCardModel["favorites"];
}): ProfileCardModel {
  const { profile, ratingSystem, stats, activity, favorites } = input;

  return {
    identity: {
      displayName: profile.displayName,
      username: profile.username,
      avatarEmoji: profile.avatarEmoji,
      avatarColor: profile.avatarColor,
      joinedAt: profile.joinedAt,
    },
    ratingSystem,
    stats,
    activity,
    favorites,
  };
}
