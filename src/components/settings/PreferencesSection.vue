<script setup lang="ts">
import { ref } from "vue";
import { auth } from "void/client";
import SettingsSection from "./SettingsSection.vue";
import { useSaveAction } from "@/composables/useSaveAction";
import type { RatingSystem } from "@/domain/rating";

const props = defineProps<{ ratingSystem: RatingSystem; timeZone: string | null }>();

const ratingOptions: { value: RatingSystem; label: string }[] = [
  { value: "score5", label: "/ 5" },
  { value: "score10", label: "/ 10" },
  { value: "score100", label: "/ 100" },
];

const ratingSystem = ref<RatingSystem>(props.ratingSystem);
const ratingSave = useSaveAction();

function setRatingSystem(value: RatingSystem) {
  ratingSystem.value = value;
  void ratingSave.run(() => auth.updateUser({ ratingSystem: value }));
}

const zones: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
const timeZone = ref<string>(props.timeZone ?? "");
const tzSave = useSaveAction();

function saveTimeZone() {
  void tzSave.run(() => auth.updateUser({ timeZone: timeZone.value }));
}

function detectTimeZone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (detected) {
    timeZone.value = detected;
    saveTimeZone();
  }
}
</script>

<template>
  <SettingsSection title="preferences">
    <div class="flex items-center justify-between px-4 py-3 gap-4">
      <div>
        <span class="text-sm font-mono text-fg-muted">rating system</span>
        <p class="text-xs text-fg-subtle mt-0.5">how scores are displayed</p>
      </div>
      <div class="flex rounded-lg border border-border overflow-hidden shrink-0" role="group">
        <button
          v-for="opt in ratingOptions"
          :key="opt.value"
          type="button"
          class="px-3 py-1.5 text-xs font-mono transition-colors"
          :class="
            ratingSystem === opt.value
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-subtle text-fg-muted hover:bg-bg-elevated hover:text-fg'
          "
          @click="setRatingSystem(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2 px-4 py-3">
      <div class="flex items-center justify-between gap-4">
        <div>
          <span class="text-sm font-mono text-fg-muted">timezone</span>
          <p class="text-xs text-fg-subtle mt-0.5">buckets your watch days and recap year</p>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors"
          @click="detectTimeZone"
        >
          detect
        </button>
      </div>
      <div class="flex gap-2">
        <select
          v-model="timeZone"
          class="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent/50 transition-colors font-mono"
        >
          <option value="" disabled>select a timezone</option>
          <option v-for="zone in zones" :key="zone" :value="zone">{{ zone }}</option>
        </select>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-border bg-bg-elevated text-fg-muted text-xs font-mono hover:text-fg hover:border-border-hover transition-colors disabled:opacity-40"
          :disabled="tzSave.saving.value || !timeZone || timeZone === (props.timeZone ?? '')"
          @click="saveTimeZone"
        >
          {{ tzSave.saving.value ? "..." : tzSave.saved.value ? "saved" : "save" }}
        </button>
      </div>
      <p v-if="tzSave.error.value || ratingSave.error.value" class="text-xs text-red-400 font-mono">
        {{ tzSave.error.value || ratingSave.error.value }}
      </p>
    </div>
  </SettingsSection>
</template>
