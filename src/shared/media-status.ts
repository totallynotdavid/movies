// Raw TMDB status strings: movie statuses plus tv statuses (some overlap).
export type MediaStatus =
  | "Rumored"
  | "Planned"
  | "In Production"
  | "Post Production"
  | "Released"
  | "Returning Series"
  | "Ended"
  | "Canceled"
  | "Pilot";

const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  Rumored: "Rumored",
  Planned: "Planned",
  "In Production": "In production",
  "Post Production": "Post-production",
  Released: "Released",
  "Returning Series": "Ongoing",
  Ended: "Ended",
  Canceled: "Canceled",
  Pilot: "Pilot",
};

export function mediaStatusLabel(status: string | null): string | null {
  if (!status) return null;
  return MEDIA_STATUS_LABELS[status as MediaStatus] ?? status;
}
