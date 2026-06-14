// Inline result action policy: movies log a watch, shows add a plan.

import { computed, ref } from "vue";
import { addToPlan, logWatch } from "@/composables/useMediaActions";
import type { MediaRef } from "@/shared/tracking";

export function useResultAction(args: {
  media: MediaRef;
  mediaType: "movie" | "show";
  tracked?: boolean;
}) {
  const state = ref<"idle" | "saving" | "done">(args.tracked ? "done" : "idle");
  const doneLabel = ref(args.tracked ? "in library" : "");

  const action = computed(() =>
    args.mediaType === "movie"
      ? {
          label: "watched",
          done: "watched",
          icon: "i-lucide:check",
          run: () => logWatch(args.media),
        }
      : { label: "add", done: "added", icon: "i-lucide:plus", run: () => addToPlan(args.media) },
  );

  async function act() {
    if (state.value !== "idle") return;
    state.value = "saving";
    const result = await action.value.run();
    if (result.ok) {
      state.value = "done";
      doneLabel.value = action.value.done;
      return;
    }
    state.value = "idle";
  }

  return { state, doneLabel, action, act };
}
