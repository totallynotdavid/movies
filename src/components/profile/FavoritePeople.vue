<script setup lang="ts">
import PersonChip from "@/components/PersonChip.vue";
import ProfileSection from "./ProfileSection.vue";

defineProps<{
  people: { personId: string; name: string; slug: string; profilePath: string | null }[];
}>();
</script>

<template>
  <ProfileSection v-if="people.length > 0" title="favorite people">
    <div class="flex flex-wrap gap-3">
      <PersonChip
        v-for="person in people"
        :key="person.personId"
        :name="person.name"
        :slug="person.slug"
        :profile-path="person.profilePath"
      />
    </div>
  </ProfileSection>
</template>
