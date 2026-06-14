import type { MediaRef } from "@/shared/tracking";

export type ActionResult = { ok: boolean; error?: string };

async function send(
  method: "POST" | "DELETE",
  url: string,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: { kind?: string } | string;
    };
    if (!res.ok) {
      const kind =
        typeof payload.error === "string" ? payload.error : (payload.error?.kind ?? "failed");
      return { ok: false, error: kind };
    }
    return { ok: true };
  } catch (caught) {
    return { ok: false, error: caught instanceof Error ? caught.message : "failed" };
  }
}

export function logWatch(media: MediaRef): Promise<ActionResult> {
  return send("POST", "/api/tracking/watch", { media });
}

export function addToPlan(media: MediaRef): Promise<ActionResult> {
  return send("POST", "/api/tracking/library", { media, status: "planned" });
}

export function removeFromLibrary(media: MediaRef): Promise<ActionResult> {
  return send("DELETE", "/api/tracking/library", { media });
}
