<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  points: { date: string; watches: number }[];
}>();

const width = 500;
const height = 80;
const paddingX = 8;
const paddingY = 10;

const ordered = computed(() => [...props.points].reverse());
const maxValue = computed(() => Math.max(...ordered.value.map((point) => point.watches), 1));
const chartPoints = computed(() => {
  const count = ordered.value.length;
  if (count === 0) return [];

  return ordered.value.map((point, index) => {
    const x = count === 1 ? width / 2 : paddingX + (index / (count - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (point.watches / maxValue.value) * (height - paddingY * 2);
    return { x, y, point };
  });
});

const linePoints = computed(() =>
  chartPoints.value.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
);
const areaPath = computed(() => {
  const points = chartPoints.value;
  if (points.length === 0) return "";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return [
    `M ${first.x.toFixed(2)} ${height - paddingY}`,
    ...points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${last.x.toFixed(2)} ${height - paddingY}`,
    "Z",
  ].join(" ");
});
</script>

<template>
  <div class="w-full max-w-xs" role="img" aria-label="recent community watch activity">
    <div class="h-6 flex items-center ps-3">
      <span class="font-mono text-xs text-fg-subtle">recent activity</span>
    </div>

    <svg
      v-if="chartPoints.length"
      class="block w-full aspect-[500/80]"
      :viewBox="`0 0 ${width} ${height}`"
      aria-hidden="true"
    >
      <path :d="areaPath" fill="var(--accent)" opacity="0.1" />
      <polyline
        :points="linePoints"
        fill="none"
        stroke="var(--accent)"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-for="{ x, y, point } in chartPoints"
        :key="point.date"
        :cx="x"
        :cy="y"
        r="2.5"
        fill="var(--bg)"
        stroke="var(--accent)"
        stroke-width="2"
      />
    </svg>

    <div v-else class="aspect-[500/80] flex items-center px-3">
      <div class="h-px w-full bg-border" />
    </div>
  </div>
</template>
