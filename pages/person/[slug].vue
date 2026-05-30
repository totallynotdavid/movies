<script setup lang="ts">
import { computed, ref } from "vue";
import type { Props } from "./[slug].server";
import { genderLabel } from "../../src/domain/people";
import FilmographyCard from "../../src/components/FilmographyCard.vue";

const TMDB_PROFILE = "https://image.tmdb.org/t/p/w342";
const BIO_PREVIEW = 500;

const props = defineProps<Props>();

const favorited = ref(props.isFavorited);
const favBusy = ref(false);
const favError = ref("");
const bioExpanded = ref(false);

const gender = computed(() => genderLabel(props.person.gender));

const age = computed(() => {
  if (!props.person.birthday) return null;
  const birth = new Date(props.person.birthday);
  const end = props.person.deathday ? new Date(props.person.deathday) : new Date();
  let years = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) years -= 1;
  return years >= 0 ? years : null;
});

const meta = computed(() => {
  const parts: string[] = [];
  if (gender.value) parts.push(gender.value);
  if (age.value !== null)
    parts.push(props.person.deathday ? `${age.value} (deceased)` : String(age.value));
  if (props.person.birthday) parts.push(`b. ${props.person.birthday}`);
  if (props.person.placeOfBirth) parts.push(props.person.placeOfBirth);
  return parts;
});

const bio = computed(() => props.person.biography ?? "");
const bioIsLong = computed(() => bio.value.length > BIO_PREVIEW);
const bioText = computed(() =>
  bioExpanded.value || !bioIsLong.value
    ? bio.value
    : `${bio.value.slice(0, BIO_PREVIEW).trimEnd()}…`,
);

async function toggleFavorite() {
  if (!props.user) {
    window.location.href = "/login";
    return;
  }
  favBusy.value = true;
  favError.value = "";
  try {
    const res = await fetch("/api/user/favorites", {
      method: favorited.value ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "person", personId: props.person.id }),
    });
    if (!res.ok) {
      const p = (await res.json()) as { error?: string };
      throw new Error(p.error ?? "failed");
    }
    favorited.value = !favorited.value;
  } catch (e) {
    favError.value = e instanceof Error ? e.message : "failed";
  } finally {
    favBusy.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Header -->
    <section class="flex flex-col sm:flex-row gap-6 motion-safe:animate-slide-up animate-fill-both">
      <div class="shrink-0 w-32 sm:w-40">
        <div class="poster-wrap rounded-xl overflow-hidden bg-bg-elevated">
          <img
            v-if="person.profilePath"
            :src="`${TMDB_PROFILE}${person.profilePath}`"
            :alt="person.name"
            loading="eager"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-fg-subtle">
            <span class="i-lucide:user w-8 h-8" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 flex-1 min-w-0">
        <div class="flex flex-col gap-1">
          <h1 class="text-3xl font-mono font-bold">{{ person.name }}</h1>
          <p v-if="meta.length" class="text-sm font-mono text-fg-muted">{{ meta.join(" · ") }}</p>
          <p v-if="person.knownForDepartment" class="text-xs font-mono text-fg-subtle">
            {{ person.knownForDepartment }}
          </p>
        </div>

        <button
          v-if="user"
          type="button"
          class="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono transition-colors focus-ring"
          :class="
            favorited
              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15'
              : 'border-border bg-bg-subtle text-fg-muted hover:border-border-hover hover:text-fg'
          "
          :disabled="favBusy"
          @click="toggleFavorite"
        >
          <span
            class="w-4 h-4"
            :class="favorited ? 'i-lucide:heart-off' : 'i-lucide:heart'"
            aria-hidden="true"
          />
          {{ favorited ? "unfavorite" : "favorite" }}
        </button>

        <div v-if="bio" class="text-sm font-mono text-fg-muted leading-relaxed max-w-prose">
          <p class="whitespace-pre-line">{{ bioText }}</p>
          <button
            v-if="bioIsLong"
            type="button"
            class="mt-1 text-fg-subtle hover:text-accent transition-colors"
            @click="bioExpanded = !bioExpanded"
          >
            {{ bioExpanded ? "show less" : "show more" }}
          </button>
        </div>

        <p v-if="favError" class="text-sm text-red-400 font-mono">{{ favError }}</p>
      </div>
    </section>

    <!-- Acting -->
    <section v-if="acting.length" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">acting · {{ acting.length }}</h2>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-5">
        <FilmographyCard v-for="f in acting" :key="f.key" v-bind="f" />
      </div>
    </section>

    <!-- Crew by department -->
    <section v-for="group in crewGroups" :key="group.department" class="flex flex-col gap-4">
      <h2 class="text-sm font-mono text-fg-muted">
        {{ group.department.toLowerCase() }} · {{ group.items.length }}
      </h2>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-5">
        <FilmographyCard v-for="f in group.items" :key="f.key" v-bind="f" />
      </div>
    </section>
  </div>
</template>
