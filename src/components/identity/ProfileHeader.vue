<script setup lang="ts">
import { computed } from "vue";
import Avatar from "./Avatar.vue";
import type { AvatarColor } from "@/shared/types/identity";

const props = defineProps<{
  displayName: string;
  username: string | null;
  avatarEmoji: string | null;
  avatarColor: AvatarColor | null;
  joinedAt: number;
}>();

const joined = computed(() =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(props.joinedAt),
);
</script>

<template>
  <header class="flex items-center gap-4 border-b border-border pb-8">
    <Avatar
      :emoji="props.avatarEmoji"
      :color="props.avatarColor"
      :name="props.displayName"
      :size="72"
    />
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl sm:text-3xl font-mono font-bold">{{ props.displayName }}</h1>
      <div class="flex items-center gap-3 text-sm font-mono text-fg-muted">
        <span v-if="props.username">@{{ props.username }}</span>
        <span v-if="props.username" aria-hidden="true">·</span>
        <span>joined {{ joined }}</span>
      </div>
    </div>
  </header>
</template>
