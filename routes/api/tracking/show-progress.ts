import { defineHandler } from "void";
import { getUser } from "void/auth";
import { listEpisodesBySeason } from "@/domain/catalog/episodes";
import { findMedia } from "@/domain/catalog/media";
import { httpStatusFor, type TrackingError } from "@/domain/errors";
import { listWatchedEpisodes } from "@/domain/tracking/watch-state";

function watchedEpisodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}:${episodeNumber}`;
}

export const GET = defineHandler(async (c) => {
  const mediaId = c.req.query("mediaId");
  if (!mediaId) {
    const error: TrackingError = {
      kind: "invalid_payload",
      field: "mediaId",
      reason: "must be provided",
    };
    return c.json({ error }, httpStatusFor(error));
  }

  const media = await findMedia(mediaId);
  if (!media.ok) {
    return c.json({ error: media.error }, httpStatusFor(media.error));
  }
  if (media.value.mediaType !== "show") {
    const error: TrackingError = {
      kind: "wrong_media_type",
      expected: "show",
      actual: media.value.mediaType,
    };
    return c.json({ error }, httpStatusFor(error));
  }

  const user = getUser();
  const [seasons, watchedEpisodes] = await Promise.all([
    listEpisodesBySeason(mediaId),
    user ? listWatchedEpisodes(user.id, mediaId) : Promise.resolve([]),
  ]);

  return {
    seasons,
    seasonCount: media.value.seasonCount,
    episodeCount: media.value.episodeCount,
    watchedEpisodeKeys: watchedEpisodes.map((episode) =>
      watchedEpisodeKey(episode.seasonNumber, episode.episodeNumber),
    ),
    episodesError: media.value.episodesError,
  };
});
