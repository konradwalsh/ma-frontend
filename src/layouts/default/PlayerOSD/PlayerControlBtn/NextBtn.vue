<template>
  <!-- next button -->
  <Icon
    v-if="isVisible && player"
    v-bind="{ ...icon, ...$attrs }"
    class="next-btn-icon"
    :disabled="!canNext || isLoading"
    variant="button"
    role="button"
    aria-label="Next track"
    :aria-disabled="!canNext || isLoading"
    @click="api.playerCommandNext(player.player_id)"
  >
    <SkipForward :size="size" aria-hidden="true" />
  </Icon>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import Icon, { IconProps } from "@/components/Icon.vue";
import api from "@/plugins/api";
import { Player, PlayerFeature, PlayerQueue } from "@/plugins/api/interfaces";
import { useActiveSource } from "@/composables/activeSource";
import { computed, toRef } from "vue";
import { SkipForward } from "lucide-vue-next";

// properties
export interface Props {
  player: Player | undefined;
  playerQueue?: PlayerQueue;
  isVisible?: boolean;
  icon?: IconProps;
  size?: number;
}
const compProps = withDefaults(defineProps<Props>(), {
  playerQueue: undefined,
  isVisible: true,
  icon: undefined,
  size: 20,
});

const { activeSource } = useActiveSource(toRef(compProps, "player"));

const queueHasNext = computed(() => {
  if (!compProps.playerQueue?.active) return false;
  return (
    (compProps.playerQueue.current_index || 0) < compProps.playerQueue.items - 1
  );
});

const playerHasNext = computed(() => {
  if (!compProps.player) return false;
  if (compProps.playerQueue?.active) return false;
  if (!compProps.player.current_media) return false;
  return compProps.player.supported_features.includes(
    PlayerFeature.NEXT_PREVIOUS,
  );
});

const canNext = computed(() => {
  // Check if active source can next/previous
  if (activeSource.value) {
    return activeSource.value.can_next_previous;
  }
  // Fall back to queue or player capabilities
  return queueHasNext.value || playerHasNext.value;
});

const isLoading = computed(() => {
  if (!compProps.player) return false;
  return (
    compProps.playerQueue?.extra_attributes?.play_action_in_progress === true
  );
});
</script>

<style>
/* Streamloader brand: secondary action — neutral with subtle teal hover */
.next-btn-icon {
  border-radius: 50%;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.next-btn-icon:hover:not([disabled]):not(.disabled) {
  background-color: rgba(15, 118, 110, 0.1); /* light teal tint */
  color: #0f766e;
}

.v-theme--dark .next-btn-icon:hover:not([disabled]):not(.disabled) {
  background-color: rgba(45, 212, 191, 0.14);
  color: #2dd4bf;
}
</style>
