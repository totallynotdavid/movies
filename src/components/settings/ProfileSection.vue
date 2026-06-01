<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import SettingsSection from "./SettingsSection.vue";
import AvatarPicker from "./AvatarPicker.vue";
import { useSaveAction } from "@/composables/useSaveAction";
import type { AvatarColor, Visibility } from "@/shared/types/identity";

const props = defineProps<{
  username: string | null;
  displayName: string;
  emoji: string | null;
  color: AvatarColor | null;
  visibility: Visibility;
}>();

const emoji = ref<string | null>(props.emoji);
const color = ref<AvatarColor | null>(props.color);
const visibility = ref<Visibility>(props.visibility);
const save = useSaveAction();

function persist() {
  void save.run(() =>
    auth.updateUser({
      avatarEmoji: emoji.value ?? "",
      ...(color.value ? { avatarColor: color.value } : {}),
      visibility: visibility.value,
    }),
  );
}

const visibilityOptions: Visibility[] = ["private", "public"];

function setVisibility(next: Visibility) {
  visibility.value = next;
}
</script>

<template>
  <SettingsSection title="profile" hint="how you appear at /u/{username}">
    <div class="flex flex-col gap-3 px-4 py-4">
      <span class="text-xs font-mono text-fg-muted">avatar</span>
      <AvatarPicker v-model:emoji="emoji" v-model:color="color" :name="props.displayName" />
    </div>

    <div class="flex items-center justify-between px-4 py-3 gap-4">
      <div>
        <span class="text-sm font-mono text-fg-muted">visibility</span>
        <p class="text-xs text-fg-subtle mt-0.5">
          {{ visibility === "public" ? "anyone with the link can view" : "only you" }}
        </p>
      </div>
      <div class="flex rounded-lg border border-border overflow-hidden shrink-0" role="group">
        <button
          v-for="opt in visibilityOptions"
          :key="opt"
          type="button"
          class="px-3 py-1.5 text-xs font-mono transition-colors"
          :class="
            visibility === opt
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-subtle text-fg-muted hover:bg-bg-elevated hover:text-fg'
          "
          @click="setVisibility(opt)"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between px-4 py-3 gap-4">
      <a
        v-if="props.username && visibility === 'public'"
        :href="`/u/${props.username}`"
        class="text-xs font-mono text-accent hover:underline truncate"
      >
        /u/{{ props.username }}
      </a>
      <span v-else-if="!props.username" class="text-xs font-mono text-fg-subtle">
        set a username to get a public link
      </span>
      <span v-else class="text-xs font-mono text-fg-subtle">private, not shared</span>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
        :disabled="save.saving.value"
        @click="persist"
      >
        {{ save.saving.value ? "..." : save.saved.value ? "saved" : "save" }}
      </button>
    </div>
    <p v-if="save.error.value" class="text-xs text-red-400 font-mono px-4 py-2">
      {{ save.error.value }}
    </p>
  </SettingsSection>
</template>
