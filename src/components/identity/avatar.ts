import type { AvatarColor } from "@/shared/types/identity";

// Background hex per avatar color. Kept as plain hex (not Uno classes) so the
// same map drives both dynamic inline styles and any SSR-rendered avatar.
export const AVATAR_COLOR_HEX: Record<AvatarColor, string> = {
  sky: "#38bdf8",
  coral: "#fb7185",
  amber: "#fbbf24",
  emerald: "#34d399",
  violet: "#a78bfa",
  magenta: "#e879f9",
  neutral: "#a1a1aa",
};

export const DEFAULT_AVATAR_COLOR: AvatarColor = "neutral";

// Fallback glyph when no emoji is set: first character of the display name.
export function avatarInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}
