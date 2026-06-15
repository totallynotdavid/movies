<script setup lang="ts">
import { computed } from "vue";
import type { ProfileCalendarDay } from "@/domain/insights/profile";

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

type CalendarWeek = {
  key: string;
  label: string;
  days: Array<ProfileCalendarDay | null>;
};

const intensitySteps = [
  { floor: 0.67, className: "border-fg/60 bg-fg/60" },
  { floor: 0.34, className: "border-fg/35 bg-fg/35" },
  { floor: 0, className: "border-fg/15 bg-fg/15" },
];

const maxCount = computed(() => Math.max(...props.days.map((day) => day.count), 0));

const weeks = computed(() => buildWeeks(props.days));

function buildWeeks(days: ProfileCalendarDay[]): CalendarWeek[] {
  const columns = days.reduce(appendDay, [] as CalendarWeek[]);
  labelWeeks(columns);
  return columns;
}

function labelWeeks(columns: CalendarWeek[]) {
  let previousMonth = "";
  for (const column of columns) {
    const month = weekMonth(column);
    column.label = month !== previousMonth ? month : "";
    if (month) previousMonth = month;
  }
}

function appendDay(columns: CalendarWeek[], day: ProfileCalendarDay): CalendarWeek[] {
  const weekday = utcWeekday(day.date);
  if (columns.length === 0 || weekday === 0) columns.push(emptyWeek());
  const column = columns.at(-1)!;
  if (!column.key) column.key = day.date;
  column.days[weekday] = day;
  return columns;
}

function emptyWeek(): CalendarWeek {
  return { key: "", label: "", days: Array.from({ length: 7 }, () => null) };
}

function weekMonth(column: CalendarWeek): string {
  const firstDay = column.days.find((day) => day !== null);
  return firstDay ? monthFormatter.format(utcDate(firstDay.date)) : "";
}

// One neutral magnitude language across the page (matching the fg-based bars in
// stats): intensity is fg opacity, not a separate hue.
function intensityClass(count: number) {
  if (count === 0 || maxCount.value === 0) {
    return "border-border bg-bg-elevated";
  }

  const ratio = count / maxCount.value;
  return intensitySteps.find((step) => ratio >= step.floor)!.className;
}

function describeDay(day: ProfileCalendarDay) {
  const formattedDate = dateFormatter.format(utcDate(day.date));
  const noun = day.count === 1 ? "watch" : "watches";
  return `${formattedDate}: ${day.count} ${noun}`;
}

function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function utcWeekday(date: string): number {
  return utcDate(date).getUTCDay();
}
</script>

<template>
  <div v-if="maxCount === 0" class="rounded-lg border border-dashed border-border px-4 py-6">
    <p class="text-sm font-mono text-fg-subtle">No watch activity yet</p>
  </div>

  <div v-else class="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-4">
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
          v-for="week in weeks"
          :key="week.key"
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
