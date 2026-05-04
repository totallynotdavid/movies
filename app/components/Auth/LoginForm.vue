<script setup lang="ts">
const login = ref('dev@example.com')
const password = ref('password')
const pending = ref(false)
const error = ref('')

async function submit() {
  pending.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { login: login.value, password: password.value },
      credentials: 'include',
    })
    await navigateTo('/library')
  } catch {
    error.value = 'Invalid credentials'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="max-w-sm w-full grid gap-4" @submit.prevent="submit">
    <label class="grid gap-2">
      <span class="font-mono text-xs text-fg-muted">email or username</span>
      <InputBase v-model="login" autocomplete="username" />
    </label>
    <label class="grid gap-2">
      <span class="font-mono text-xs text-fg-muted">password</span>
      <InputBase v-model="password" type="password" autocomplete="current-password" />
    </label>
    <p v-if="error" class="text-sm text-fg">{{ error }}</p>
    <ButtonBase type="submit" variant="primary" :disabled="pending">
      {{ pending ? 'signing in' : 'sign in' }}
    </ButtonBase>
  </form>
</template>
