const MESSAGES: Record<string, string> = {
  already_at_episode_total: "you've already logged every episode",
  media_not_found: "we couldn't find that title",
  wrong_media_type: "that action doesn't apply to this title",
  invalid_payload: "that request wasn't valid",
  persistence_failed: "something went wrong saving that",
};

export function trackingMessage(kind: string): string {
  return MESSAGES[kind] ?? "something went wrong, try again";
}
