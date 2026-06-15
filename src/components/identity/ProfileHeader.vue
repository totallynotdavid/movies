<script setup lang="ts">
import { computed } from "vue";
import Avatar from "./Avatar.vue";
import type { AvatarColor } from "@/shared/types/identity";

const props = defineProps<{
  identity: {
    displayName: string;
    username: string | null;
    avatarEmoji: string | null;
    avatarColor: AvatarColor | null;
    joinedAt: number;
  };
}>();

const joined = computed(() =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    props.identity.joinedAt,
  ),
);
</script>

<template>
  <header class="flex flex-wrap items-center gap-4 border-b border-border pb-8">
    <Avatar
      :emoji="props.identity.avatarEmoji"
      :color="props.identity.avatarColor"
      :name="props.identity.displayName"
      :size="72"
    />
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl sm:text-3xl font-mono font-bold">{{ props.identity.displayName }}</h1>
      <div class="flex items-center gap-3 text-sm font-mono text-fg-muted">
        <span v-if="props.identity.username">@{{ props.identity.username }}</span>
        <span v-if="props.identity.username" aria-hidden="true">·</span>
        <span>joined {{ joined }}</span>
      </div>
      <div v-if="$slots.meta" class="mt-2">
        <slot name="meta" />
      </div>
    </div>
    <!-- Right-side meta column, npmx's ms-auto/text-end slot: a pure pass-through the
         page fills with owner controls and the year switcher. Quiet, secondary to
         the identity block. -->
    <div v-if="$slots.aside" class="ml-auto flex flex-col items-end gap-2">
      <slot name="aside" />
    </div>
  </header>
</template>
