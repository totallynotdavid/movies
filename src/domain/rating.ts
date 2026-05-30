export type RatingSystem = "score5" | "score10" | "score100";

const ratingSystems: RatingSystem[] = ["score5", "score10", "score100"];

export function parseRatingSystem(value: unknown): RatingSystem {
  if (typeof value === "string" && ratingSystems.includes(value as RatingSystem)) {
    return value as RatingSystem;
  }
  return "score100";
}

function scaleFor(system: RatingSystem): number {
  if (system === "score5") return 20;
  if (system === "score10") return 10;
  return 1;
}

export function scoreMax(system: RatingSystem): number {
  if (system === "score5") return 5;
  if (system === "score10") return 10;
  return 100;
}

/** Convert a user-facing value in the given system to the canonical 0–100 scale. */
export function toScore100(value: number, system: RatingSystem): number {
  const score100 = value * scaleFor(system);
  return Math.min(100, Math.max(0, score100));
}

/** Convert canonical 0–100 to a rounded user-facing value in the given system. */
export function toDisplayScore(score100: number, system: RatingSystem): number {
  return Math.round(score100 / scaleFor(system));
}

/** Render canonical 0–100 (or null) as "value/max" in the given system, e.g. "4.5/5". */
export function formatScore(score100: number | null, system: RatingSystem): string {
  if (score100 === null) return "—";
  const value = score100 / scaleFor(system);
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text}/${scoreMax(system)}`;
}
