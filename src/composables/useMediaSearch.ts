import { ref } from "vue";
import type { MediaSearchCandidate } from "@/shared/tracking";

export type LocalResult = {
  id: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
};

export type RemoteResult = MediaSearchCandidate;

type SearchResponse = {
  error?: string;
  remoteEnabled?: boolean;
  local?: LocalResult[];
  remote?: RemoteResult[];
};

export function useMediaSearch(options?: { limit?: number }) {
  const limit = options?.limit ?? 12;
  const query = ref("");
  const loading = ref(false);
  const error = ref("");
  const local = ref<LocalResult[]>([]);
  const remote = ref<RemoteResult[]>([]);
  const remoteEnabled = ref(false);
  const hasSearched = ref(false);

  async function run() {
    const q = query.value.trim();
    if (!q) return;

    error.value = "";
    hasSearched.value = true;
    loading.value = true;
    local.value = [];
    remote.value = [];

    try {
      const res = await fetch(`/api/media/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const payload = (await res.json()) as SearchResponse;
      if (!res.ok) throw new Error(payload.error ?? "search failed");

      remoteEnabled.value = Boolean(payload.remoteEnabled);
      local.value = payload.local ?? [];
      remote.value = payload.remote ?? [];
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "search failed";
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    query.value = "";
    local.value = [];
    remote.value = [];
    hasSearched.value = false;
    error.value = "";
  }

  return { query, loading, error, local, remote, remoteEnabled, hasSearched, run, clear };
}
