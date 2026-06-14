<script setup lang="ts">
import { ref } from "vue";
import Btn from "@/components/ui/Btn.vue";

const props = defineProps<{
  mediaId: string;
  initial: boolean;
  loggedIn: boolean;
}>();

const favorited = ref(props.initial);
const saving = ref(false);
const error = ref("");
// Bumping the key remounts the icon so the keyframe replays on each toggle.
const pulse = ref(0);

async function toggle() {
  if (!props.loggedIn) {
    window.location.href = "/login";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    const res = await fetch("/api/user/favorites", {
      method: favorited.value ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "media", mediaId: props.mediaId }),
    });
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      throw new Error(payload.error ?? "failed");
    }
    favorited.value = !favorited.value;
    pulse.value++;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "failed";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Btn
    variant="secondary"
    :aria-label="favorited ? 'remove from favorites' : 'add to favorites'"
    :aria-pressed="favorited ? 'true' : 'false'"
    :disabled="saving"
    :title="error || undefined"
    class="py-1.5! px-2.5!"
    @click="toggle"
  >
    <span
      :key="pulse"
      class="i-lucide:heart size-[1em]"
      :class="pulse > 0 ? (favorited ? 'pulse-spring' : 'pulse-settle') : ''"
      aria-hidden="true"
    />
    <span class="max-sm:sr-only">{{ favorited ? "favorited" : "favorite" }}</span>
    <span v-if="error" role="alert" class="sr-only">{{ error }}</span>
  </Btn>
</template>

<style scoped>
.pulse-spring {
  animation: heart-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pulse-settle {
  animation: heart-settle 0.3s ease;
}

@keyframes heart-spring {
  0% {
    transform: scale(1);
  }
  15% {
    transform: scale(0.8);
  }
  45% {
    transform: scale(1.4);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes heart-settle {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(0.85);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-spring,
  .pulse-settle {
    animation: none;
  }
}
</style>
