<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import { useRouter } from "@void/vue";

const router = useRouter();
const email = ref("");
const password = ref("");
const mode = ref<"signin" | "signup">("signin");
const error = ref("");

async function submit() {
  error.value = "";
  try {
    if (mode.value === "signup") {
      await auth.signUp.email({ email: email.value, password: password.value, name: "New User" });
    } else {
      await auth.signIn.email({ email: email.value, password: password.value });
    }
    await router.navigate("/library");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Authentication failed";
  }
}
</script>

<template>
  <section class="auth-wrap">
    <div class="auth-card">
      <h1>sign in</h1>
      <p class="subtle">void-managed auth client.</p>

      <div class="toggle-row">
        <button type="button" class="btn btn-secondary" @click="mode = 'signin'">Sign in</button>
        <button type="button" class="btn btn-secondary" @click="mode = 'signup'">Sign up</button>
      </div>

      <form class="form-grid" @submit.prevent="submit">
        <input v-model="email" type="email" required placeholder="Email" />
        <input v-model="password" type="password" required placeholder="Password" minlength="8" />
        <button type="submit" class="btn btn-primary">
          {{ mode === "signin" ? "Sign in" : "Create account" }}
        </button>
      </form>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </section>
</template>
