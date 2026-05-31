import type { MediaType } from "./catalog/media";

export type TrackingError =
  | { kind: "media_not_found"; mediaId: string }
  | { kind: "wrong_media_type"; expected: MediaType; actual: MediaType }
  | { kind: "already_at_episode_total"; total: number }
  // Quick-logging "next episode" needs the aired episode list, which is hydrated
  // off-request. Until it lands, the caller must pass an explicit episode.
  | { kind: "episodes_not_ready"; mediaId: string }
  | { kind: "invalid_payload"; field: string; reason: string }
  | { kind: "persistence_failed"; cause: unknown };

export function httpStatusFor(error: TrackingError): 400 | 404 | 409 | 422 | 500 {
  switch (error.kind) {
    case "media_not_found":
      return 404;
    case "already_at_episode_total":
      return 409;
    case "episodes_not_ready":
      return 409;
    case "wrong_media_type":
      return 422;
    case "invalid_payload":
      return 400;
    case "persistence_failed":
      return 500;
  }
}
