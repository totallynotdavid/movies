import type { AvatarColor } from "@/shared/types/identity";
import type { ProfileIdentity } from "@/domain/user";
import type { RatingSystem } from "@/domain/rating";
import type { MediaRecord } from "@/domain/catalog/media";
import {
  getProfileActivity,
  type ProfileActivity,
  type ProfileStats,
} from "@/domain/insights/profile";
import { favoriteMediaForUser, favoritePeopleForUser } from "@/domain/tracking/favorites";

export type ProfileCard = {
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

export async function getProfileCard(
  profile: ProfileIdentity,
  ratingSystem: RatingSystem,
): Promise<ProfileCard> {
  const [core, media, people] = await Promise.all([
    getProfileActivity(profile.id),
    favoriteMediaForUser(profile.id),
    favoritePeopleForUser(profile.id),
  ]);

  return {
    identity: {
      displayName: profile.displayName,
      username: profile.username,
      avatarEmoji: profile.avatarEmoji,
      avatarColor: profile.avatarColor,
      joinedAt: profile.joinedAt,
    },
    ratingSystem,
    stats: core.stats,
    activity: core.activity,
    favorites: { media, people },
  };
}
