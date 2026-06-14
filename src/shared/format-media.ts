export function yearOf(date: string | null | undefined): string | null {
  if (!date) return null;
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? null : String(year);
}

export function runtimeText(runtime: number | null | undefined): string | null {
  return runtime ? `${runtime} min` : null;
}

export function episodeSummary(
  seasonCount: number | null | undefined,
  episodeCount: number | null | undefined,
): string | null {
  const parts: string[] = [];
  if (seasonCount) parts.push(`${seasonCount} season${seasonCount === 1 ? "" : "s"}`);
  if (episodeCount) parts.push(`${episodeCount} episode${episodeCount === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function votesText(voteCount: number | null | undefined): string | null {
  return voteCount ? `${voteCount.toLocaleString()} votes` : null;
}

// TMDB scores are out of 10; the UI shows a five-point scale.
export function scoreText(voteAverage: number | null | undefined): string | null {
  return voteAverage ? `${(voteAverage / 2).toFixed(1)}/5` : null;
}

export function airedText(
  start: string | null | undefined,
  end: string | null | undefined,
  isShow: boolean,
): string | null {
  if (!start) return null;
  if (isShow && end && end !== start) return `${start} → ${end}`;
  return start;
}
