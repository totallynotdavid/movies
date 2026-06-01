<script setup lang="ts">
import { ref, computed } from "vue";
import { auth } from "void/client";
import SettingsSection from "./SettingsSection.vue";
import { useSaveAction } from "@/composables/useSaveAction";
import { isValidUsername, USERNAME_RULES } from "@/shared/types/identity";

const props = defineProps<{
  username: string | null;
  displayName: string;
  email: string;
}>();

const name = ref(props.displayName);
const nameSave = useSaveAction();

const username = ref(props.username ?? "");
const usernameSave = useSaveAction();
const usernameValid = computed(
  () => username.value.length === 0 || isValidUsername(username.value.toLowerCase()),
);

const currentPassword = ref("");
const newPassword = ref("");
const passwordSave = useSaveAction();

function saveName() {
  void nameSave.run(() => auth.updateUser({ name: name.value }));
}

function saveUsername() {
  const handle = username.value.toLowerCase();
  if (!isValidUsername(handle)) return;
  void usernameSave.run(() => auth.updateUser({ username: handle }));
}

async function savePassword() {
  const ok = await passwordSave.run(() =>
    auth.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      revokeOtherSessions: true,
    }),
  );
  if (ok) {
    currentPassword.value = "";
    newPassword.value = "";
  }
}
</script>

<template>
  <SettingsSection title="account">
    <div class="flex flex-col gap-2 px-4 py-3">
      <label class="text-xs font-mono text-fg-muted" for="display-name">display name</label>
      <div class="flex gap-2">
        <input
          id="display-name"
          v-model="name"
          type="text"
          class="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent/50 transition-colors font-mono"
        />
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
          :disabled="nameSave.saving.value || name === props.displayName"
          @click="saveName"
        >
          {{ nameSave.saving.value ? "..." : nameSave.saved.value ? "saved" : "save" }}
        </button>
      </div>
      <p v-if="nameSave.error.value" class="text-xs text-red-400 font-mono">
        {{ nameSave.error.value }}
      </p>
    </div>

    <div class="flex flex-col gap-2 px-4 py-3">
      <label class="text-xs font-mono text-fg-muted" for="username">username</label>
      <div class="flex gap-2">
        <div class="flex flex-1 items-center bg-bg-elevated border border-border rounded-lg px-3">
          <span class="text-sm text-fg-subtle font-mono">/u/</span>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :minlength="USERNAME_RULES.min"
            :maxlength="USERNAME_RULES.max"
            class="flex-1 bg-transparent py-1.5 text-sm text-fg outline-none font-mono lowercase"
          />
        </div>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
          :disabled="
            usernameSave.saving.value ||
            !usernameValid ||
            username.toLowerCase() === (props.username ?? '')
          "
          @click="saveUsername"
        >
          {{ usernameSave.saving.value ? "..." : usernameSave.saved.value ? "saved" : "save" }}
        </button>
      </div>
      <p v-if="!usernameValid" class="text-xs text-amber-400 font-mono">
        3–20 chars: lowercase letters, numbers, underscore.
      </p>
      <p v-else-if="usernameSave.error.value" class="text-xs text-red-400 font-mono">
        {{ usernameSave.error.value }}
      </p>
    </div>

    <!-- email is read-only; changing it requires email verification flow -->
    <div class="flex items-center justify-between px-4 py-3 gap-4">
      <span class="text-xs font-mono text-fg-muted">email</span>
      <span class="text-sm font-mono text-fg">{{ props.email }}</span>
    </div>

    <div class="flex flex-col gap-2 px-4 py-3">
      <span class="text-xs font-mono text-fg-muted">change password</span>
      <input
        v-model="currentPassword"
        type="password"
        placeholder="current password"
        autocomplete="current-password"
        class="bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent/50 transition-colors font-mono"
      />
      <div class="flex gap-2">
        <input
          v-model="newPassword"
          type="password"
          placeholder="new password"
          autocomplete="new-password"
          minlength="8"
          class="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent/50 transition-colors font-mono"
        />
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
          :disabled="passwordSave.saving.value || !currentPassword || newPassword.length < 8"
          @click="savePassword"
        >
          {{ passwordSave.saving.value ? "..." : passwordSave.saved.value ? "changed" : "update" }}
        </button>
      </div>
      <p v-if="passwordSave.error.value" class="text-xs text-red-400 font-mono">
        {{ passwordSave.error.value }}
      </p>
    </div>
  </SettingsSection>
</template>
