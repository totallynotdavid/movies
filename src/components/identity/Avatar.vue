<script setup lang="ts">
import { computed } from "vue";
import type { AvatarColor } from "@/shared/types/identity";
import { AVATAR_COLOR_HEX, DEFAULT_AVATAR_COLOR, avatarInitial } from "./avatar";

const props = withDefaults(
  defineProps<{
    emoji: string | null;
    color: AvatarColor | null;
    name: string;
    size?: number;
  }>(),
  { size: 40 },
);

const background = computed(() => AVATAR_COLOR_HEX[props.color ?? DEFAULT_AVATAR_COLOR]);
const glyph = computed(() => props.emoji?.trim() || avatarInitial(props.name));
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-mono text-bg select-none"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background,
      fontSize: `${Math.round(size * 0.5)}px`,
    }"
    aria-hidden="true"
  >
    {{ glyph }}
  </span>
</template>
