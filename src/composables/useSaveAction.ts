import { ref } from "vue";

// Wraps an auth-client mutation with saving/saved/error state. Better Auth client
// calls resolve to `{ data, error }` (and may also throw), so we treat a returned
// `error` field and a thrown exception the same way.
export function useSaveAction() {
  const saving = ref(false);
  const saved = ref(false);
  const error = ref("");

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    saving.value = true;
    saved.value = false;
    error.value = "";
    try {
      const result = await action();
      if (result && typeof result === "object" && "error" in result) {
        const err = (result as { error: { message?: string } | null }).error;
        if (err) throw new Error(err.message ?? "update failed");
      }
      saved.value = true;
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "update failed";
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { saving, saved, error, run };
}
