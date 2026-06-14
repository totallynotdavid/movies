import { computed, ref } from "vue";
import { addToPlan, logWatch, removeFromLibrary } from "@/composables/useMediaActions";
import { useToast } from "@/composables/useToast";
import { trackingMessage } from "@/shared/tracking-messages";
import type { MediaRef } from "@/shared/tracking";

// The one-shot tracking action behind a search result row. Every outcome now
// reports through the toast channel, so the most common path (log/add from a
// result) can no longer fail silently, and a success offers an immediate undo.
export function useResultAction(args: {
  media: MediaRef;
  mediaType: "movie" | "show";
  tracked?: boolean;
}) {
  const toast = useToast();
  const state = ref<"idle" | "saving" | "done">(args.tracked ? "done" : "idle");
  const doneLabel = ref(args.tracked ? "in library" : "");

  const action = computed(() =>
    args.mediaType === "movie"
      ? {
          label: "watched",
          done: "watched",
          success: "watch logged",
          icon: "i-lucide:check",
          run: () => logWatch(args.media),
        }
      : {
          label: "add",
          done: "added",
          success: "added to your library",
          icon: "i-lucide:plus",
          run: () => addToPlan(args.media),
        },
  );

  async function undo() {
    const result = await removeFromLibrary(args.media);
    if (!result.ok) {
      toast.error(trackingMessage(result.error ?? "failed"));
      return;
    }
    state.value = "idle";
    doneLabel.value = "";
    toast.info("removed from your library");
  }

  async function act() {
    if (state.value !== "idle") return;
    state.value = "saving";
    const result = await action.value.run();
    if (result.ok) {
      state.value = "done";
      doneLabel.value = action.value.done;
      toast.success(action.value.success, { label: "undo", run: undo });
      return;
    }
    state.value = "idle";
    toast.error(trackingMessage(result.error ?? "failed"));
  }

  return { state, doneLabel, action, act };
}
