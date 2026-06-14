export const LIBRARY_STATUSES = ["planned", "watching", "completed", "paused", "dropped"] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  planned: "planned",
  watching: "watching",
  completed: "completed",
  paused: "paused",
  dropped: "dropped",
};

export function parseLibraryStatus(value: unknown): LibraryStatus | null {
  return LIBRARY_STATUSES.find((status) => status === value) ?? null;
}

export const statusBg = (status: LibraryStatus): string => `bg-status-${status}`;
export const statusBadge = (status: LibraryStatus): string => `badge-${status}`;
