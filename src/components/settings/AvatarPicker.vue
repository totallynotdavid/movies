<script setup lang="ts">
import Avatar from "@/components/identity/Avatar.vue";
import { AVATAR_COLORS, type AvatarColor } from "@/shared/types/identity";
import { AVATAR_COLOR_HEX } from "@/components/identity/avatar";

const props = defineProps<{ emoji: string | null; color: AvatarColor | null; name: string }>();
const emit = defineEmits<{
  "update:emoji": [string | null];
  "update:color": [AvatarColor];
}>();

// Keep a single grapheme. Empty clears back to the initial-letter fallback.
function onEmojiInput(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim();
  emit("update:emoji", value ? [...value][0]! : null);
}
</script>

<template>
  <div class="flex items-center gap-4">
    <Avatar :emoji="props.emoji" :color="props.color" :name="props.name" :size="56" />
    <div class="flex flex-col gap-3">
      <input
        :value="props.emoji ?? ''"
        type="text"
        inputmode="text"
        maxlength="8"
        placeholder="emoji"
        aria-label="avatar emoji"
        class="w-24 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-fg text-center outline-none focus:border-accent/50 transition-colors font-mono"
        @input="onEmojiInput"
      />
      <div class="flex gap-2" role="group" aria-label="avatar color">
        <button
          v-for="c in AVATAR_COLORS"
          :key="c"
          type="button"
          class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          :class="props.color === c ? 'border-fg' : 'border-transparent'"
          :style="{ background: AVATAR_COLOR_HEX[c] }"
          :aria-label="c"
          :aria-pressed="props.color === c"
          @click="emit('update:color', c)"
        />
      </div>
    </div>
  </div>
</template>
