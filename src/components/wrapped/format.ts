const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

// Tenths of an hour under 10h, whole hours above, so headline figures stay legible.
export function formatHours(minutes: number): string {
  if (minutes === 0) return "0h";
  const hours = minutes / 60;
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${hours.toFixed(1)}h`;
}

// Prefer watch time when runtimes are known; fall back to a watch count when not.
export function formatMetric(minutes: number, watchCount: number): string {
  if (minutes > 0) return `${formatHours(minutes)} watched`;
  return watchCount === 1 ? "1 watch" : `${watchCount} watches`;
}

export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function formatDay(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}
