<template>
  <Button
    variant="icon"
    :ripple="false"
    icon
    :class="{ 'speaker-btn': true, 'speaker-btn--active': isActive }"
    :title="$t('players')"
    :aria-label="$t('players')"
    :aria-pressed="isActive"
    aria-haspopup="menu"
    :aria-expanded="isActive"
    @click="openPlayersMenu"
  >
    <v-icon
      :color="iconColor"
      :size="24"
      aria-hidden="true"
      :icon="
        store.activePlayer?.group_members.length
          ? 'mdi-speaker-multiple'
          : 'mdi-speaker'
      "
    />
  </Button>
</template>

<script setup lang="ts">
import Button from "@/components/Button.vue";
import { store } from "@/plugins/store";
import { computed } from "vue";

export interface Props {
  color?: string;
}
const props = defineProps<Props>();

const isActive = computed(() => store.showPlayersMenu);

const iconColor = computed(() => {
  if (isActive.value) return "primary";
  return props.color ? props.color : "";
});

function openPlayersMenu() {
  store.showPlayersMenu = !store.showPlayersMenu;
}
</script>

<style scoped>
.speaker-btn {
  transition:
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 220ms ease,
    background-color 180ms ease;
  border-radius: 12px;
}

.speaker-btn:hover:not(:disabled) {
  background-color: rgba(45, 212, 191, 0.12);
}

.speaker-btn--active {
  transform: scale(1.08);
  background-color: rgba(45, 212, 191, 0.18);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.45),
    0 0 14px 2px rgba(45, 212, 191, 0.55),
    0 0 28px 4px rgba(45, 212, 191, 0.25);
}

.speaker-btn--active:hover:not(:disabled) {
  background-color: rgba(45, 212, 191, 0.26);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.6),
    0 0 18px 3px rgba(45, 212, 191, 0.65),
    0 0 32px 6px rgba(45, 212, 191, 0.32);
}

:global(.v-theme--light) .speaker-btn:hover:not(:disabled) {
  background-color: rgba(15, 118, 110, 0.1);
}

:global(.v-theme--light) .speaker-btn--active {
  background-color: rgba(15, 118, 110, 0.14);
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.45),
    0 0 12px 2px rgba(15, 118, 110, 0.4),
    0 0 24px 4px rgba(15, 118, 110, 0.18);
}

:global(.v-theme--light) .speaker-btn--active:hover:not(:disabled) {
  background-color: rgba(15, 118, 110, 0.2);
}
</style>
