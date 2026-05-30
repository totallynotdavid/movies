<script setup lang="ts">
import { computed } from "vue";
import type { ProfileCalendarDay } from "../../domain/profile-stats";

const props = defineProps<{
  days: ProfileCalendarDay[];
}>();

const weekdayLabels = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const maxCount = computed(() => Math.max(...props.days.map((day) => day.count), 0));

const weeks = computed(() => {
  const columns: Array<{ label: string; days: Array<ProfileCalendarDay | null> }> = [];

  for (const day of props.days) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (columns.length === 0 || weekday === 0) {
      columns.push({ label: "", days: Array.from({ length: 7 }, () => null) });
    }

    columns.at(-1)!.days[weekday] = day;
  }

  let previousMonth = "";
  for (const column of columns) {
    const firstDay = column.days.find((day) => day !== null);
    const month = firstDay ? monthFormatter.format(new Date(`${firstDay.date}T00:00:00Z`)) : "";
    column.label = month !== previousMonth ? month : "";
    if (month) previousMonth = month;
  }

  return columns;
});

function intensityClass(count: number) {
  if (count === 0 || maxCount.value === 0) {
    return "border-border bg-bg-elevated";
  }

  const ratio = count / maxCount.value;
  if (ratio < 0.34) return "border-emerald-500/25 bg-emerald-500/25";
  if (ratio < 0.67) return "border-emerald-500/40 bg-emerald-500/45";
  return "border-emerald-400/50 bg-emerald-400/70";
}

function describeDay(day: ProfileCalendarDay) {
  const formattedDate = dateFormatter.format(new Date(`${day.date}T00:00:00Z`));
  const noun = day.count === 1 ? "watch" : "watches";
  return `${formattedDate}: ${day.count} ${noun}`;
}
</script>

<template>
  <div v-if="maxCount === 0" class="rounded-xl border border-dashed border-border px-4 py-6">
    <p class="text-sm font-mono text-fg-subtle">No watch activity yet</p>
  </div>

  <div v-else class="overflow-x-auto">
    <div class="inline-flex gap-3 min-w-max">
      <div class="grid grid-rows-[1rem_repeat(7,minmax(0,0.875rem))] gap-1 pt-1">
        <span />
        <span
          v-for="label in weekdayLabels"
          :key="label"
          class="flex items-center text-[0.65rem] font-mono text-fg-subtle uppercase"
        >
          {{ label }}
        </span>
      </div>

      <div class="flex gap-1">
        <div
          v-for="(week, index) in weeks"
          :key="index"
          class="grid grid-rows-[1rem_repeat(7,minmax(0,0.875rem))] gap-1"
        >
          <span class="text-[0.65rem] font-mono text-fg-subtle">{{ week.label }}</span>
          <template v-for="(day, weekday) in week.days" :key="weekday">
            <div
              v-if="day"
              :title="describeDay(day)"
              :aria-label="describeDay(day)"
              tabindex="0"
              class="h-3.5 w-3.5 rounded-[4px] border transition-colors focus:outline-none focus:ring-1 focus:ring-accent/50"
              :class="intensityClass(day.count)"
            />
            <div v-else class="h-3.5 w-3.5" aria-hidden="true" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
