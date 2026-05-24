<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import { useRouter } from "@void/vue";

const router = useRouter();
const email = ref("");
const password = ref("");
const name = ref("");
const mode = ref<"signin" | "signup">("signin");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    if (mode.value === "signup") {
      await auth.signUp.email({
        email: email.value,
        password: password.value,
        name: name.value || email.value.split("@")[0],
      });
    } else {
      await auth.signIn.email({ email: email.value, password: password.value });
    }
    await router.navigate("/library");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "authentication failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-sm flex flex-col gap-6">
      <!-- Mode toggle -->
      <div class="flex p-1 rounded-xl bg-bg-subtle border border-border gap-1">
        <button
          type="button"
          class="flex-1 py-2 rounded-lg text-sm font-mono transition-all duration-150"
          :class="
            mode === 'signin' ? 'bg-bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
          "
          @click="mode = 'signin'"
        >
          sign in
        </button>
        <button
          type="button"
          class="flex-1 py-2 rounded-lg text-sm font-mono transition-all duration-150"
          :class="
            mode === 'signup' ? 'bg-bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
          "
          @click="mode = 'signup'"
        >
          sign up
        </button>
      </div>

      <!-- Form -->
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-3">
          <div v-if="mode === 'signup'" class="flex flex-col gap-1.5">
            <label class="text-xs font-mono text-fg-muted" for="name">name</label>
            <input
              id="name"
              v-model="name"
              type="text"
              placeholder="your name"
              class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-mono text-fg-muted" for="email">email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
              class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-mono text-fg-muted" for="password">password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="8"
              placeholder="••••••••"
              class="bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent/50 transition-colors font-mono"
            />
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-400 font-mono">{{ error }}</p>

        <button
          type="submit"
          class="w-full py-2.5 rounded-lg border border-accent/40 bg-accent/10 text-fg font-mono text-sm hover:bg-accent/15 transition-colors disabled:opacity-40"
          :disabled="loading"
        >
          {{ loading ? "..." : mode === "signin" ? "sign in" : "create account" }}
        </button>
      </form>
    </div>
  </div>
</template>
