<script setup lang="ts">
import { computed } from "vue";
import type { DayPartPattern, GenreTiming, Phase, WeekdayPattern } from "@/domain/insights/mirror";
import ProfileSection from "@/components/identity/ProfileSection.vue";

const props = defineProps<{
  weekday: WeekdayPattern;
  dayPart: DayPartPattern;
  genreTiming: GenreTiming;
  phase: Phase | null;
}>();

// Earn the insight: a couple of watches isn't a pattern. Below this, say nothing
// rather than over-claim.
const MIN_WATCHES = 7;
const NIGHT_OWL_SHARE = 0.3;

const hasPattern = computed(
  () => props.weekday.totalWatches >= MIN_WATCHES && props.weekday.busiest !== null,
);

const max = computed(() => Math.max(1, ...props.weekday.byWeekday.map((d) => d.watchCount)));

const headline = computed(() => {
  const busiest = props.weekday.busiest;
  if (!busiest) return "";
  const weekendPct = Math.round(props.weekday.weekendShare * 100);
  const lean =
    weekendPct >= 60
      ? ", leaning to the weekend"
      : weekendPct <= 25
        ? ", mostly on weeknights"
        : "";
  return `You watch most on ${busiest.label}s${lean}.`;
});

function formatHour(hour: number) {
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}${hour < 12 ? "am" : "pm"}`;
}

const rhythm = computed(() => {
  const { peakHour, nightOwlShare } = props.dayPart;
  if (nightOwlShare >= NIGHT_OWL_SHARE) {
    return `A night owl, with ${Math.round(nightOwlShare * 100)}% of watches after midnight.`;
  }
  if (peakHour !== null) {
    return `Your watches cluster around ${formatHour(peakHour)}.`;
  }
  return "";
});

const genreSplit = computed(() => {
  const { weekendGenre, weeknightGenre } = props.genreTiming;
  if (!weekendGenre || !weeknightGenre) return "";
  return `${weekendGenre.genre.toLowerCase()} on weekends, ${weeknightGenre.genre.toLowerCase()} on weeknights.`;
});

const phaseText = computed(() => {
  if (!props.phase) return "";
  return `${props.phase.label} was a ${props.phase.genre.toLowerCase()} phase, ${Math.round(props.phase.monthShare * 100)}% of that month.`;
});

function barHeight(watchCount: number) {
  return `${Math.max(6, Math.round((watchCount / max.value) * 100))}%`;
}
</script>

<template>
  <ProfileSection v-if="hasPattern" title="your patterns">
    <div class="flex flex-col gap-4">
      <p class="text-[0.8rem] font-mono text-fg-subtle">{{ headline }}</p>

      <div class="flex items-end gap-2 rounded-lg border border-border bg-bg-subtle p-4">
        <div
          v-for="day in weekday.byWeekday"
          :key="day.weekday"
          class="flex flex-1 flex-col items-center gap-2"
        >
          <div class="flex h-24 w-full items-end">
            <div
              class="w-full rounded-t-sm transition-colors"
              :class="day.weekday === weekday.busiest?.weekday ? 'bg-accent' : 'bg-fg/20'"
              :style="{ height: barHeight(day.watchCount) }"
              :title="`${day.watchCount} watches`"
            />
          </div>
          <span class="text-[0.65rem] font-mono uppercase text-fg-subtle">
            {{ day.label.slice(0, 1) }}
          </span>
        </div>
      </div>

      <ul
        v-if="rhythm || genreSplit || phaseText"
        class="flex flex-col gap-1.5 text-[0.8rem] font-mono text-fg-subtle"
      >
        <li v-if="rhythm" class="flex items-center gap-2">
          <span class="i-lucide:moon h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          {{ rhythm }}
        </li>
        <li v-if="genreSplit" class="flex items-center gap-2">
          <span class="i-lucide:shuffle h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          {{ genreSplit }}
        </li>
        <li v-if="phaseText" class="flex items-center gap-2">
          <span class="i-lucide:trending-up h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          {{ phaseText }}
        </li>
      </ul>
    </div>
  </ProfileSection>
</template>
