// Public activity is day-granular so profile feeds never expose exact watch timestamps.

export type ActivityEntry = {
  id: string;
  title: string;
  slug: string;
  mediaType: "movie" | "show";
  posterPath: string | null;
  watchedOn: string; // local watch day, YYYY-MM-DD
  seasonNumber: number | null;
  episodeNumber: number | null;
  score100: number | null; // null hides the score (e.g. on a public profile)
};

export type ActivityGroup = { label: string; items: ActivityEntry[] };

// The watch date is the spine of the feed: today / yesterday / a short date.
// Parsed as a local calendar day so the label never drifts across a timezone.
function dayLabel(watchedOn: string, today: Date): string {
  const [y, m, d] = watchedOn.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((midnight.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  const sameYear = day.getFullYear() === today.getFullYear();
  return day.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// Groups already-sorted (newest first) entries under one header per day.
export function groupActivityByDay(entries: ActivityEntry[], now = new Date()): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.watchedOn, now);
    const last = groups.at(-1);
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }
  return groups;
}
