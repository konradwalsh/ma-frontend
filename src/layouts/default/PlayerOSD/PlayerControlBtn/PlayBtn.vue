<template>
  <!-- play/pause button: disabled if no content -->
  <Icon
    v-if="isVisible && player"
    v-bind="{ ...icon, ...$attrs }"
    class="play-btn-icon"
    :disabled="!canPlayPause || isLoading"
    variant="button"
    @click="api.playerCommandPlayPause(player.player_id)"
  >
    <Pause v-if="isPlaying" :size="size" fill="currentColor" />
    <Play
      v-else
      :size="size"
      fill="currentColor"
      :style="{ marginLeft: `${compProps.playOffset}px` }"
    />
  </Icon>
  <v-progress-circular
    v-if="isVisible && player && isLoading"
    class="play-btn-spinner"
    indeterminate
    :size="compProps.spinnerSize"
    :width="2"
  />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import Icon, { IconProps } from "@/components/Icon.vue";
import { useActiveSource } from "@/composables/activeSource";
import api from "@/plugins/api";
import { PlaybackState, Player, PlayerQueue } from "@/plugins/api/interfaces";
import { Pause, Play } from "lucide-vue-next";
import { computed, toRef } from "vue";

// properties
export interface Props {
  player: Player | undefined;
  playerQueue?: PlayerQueue;
  isVisible?: boolean;
  icon?: IconProps;
  spinnerSize?: number;
  size?: number;
  playOffset?: number;
}

const compProps = withDefaults(defineProps<Props>(), {
  playerQueue: undefined,
  isVisible: true,
  icon: undefined,
  spinnerSize: 46,
  size: 24,
  playOffset: 1,
});

const { activeSource } = useActiveSource(toRef(compProps, "player"));

const queueCanPlay = computed(() => {
  if (!compProps.playerQueue) return false;
  return compProps.playerQueue.items > 0;
});

const playerCanPlay = computed(() => {
  if (!compProps.player) return false;
  if (compProps.playerQueue?.active) return false;
  if (!compProps.player.current_media) return false;
  return true;
});

const canPlayPause = computed(() => {
  // Check if active source can play/pause
  if (activeSource.value) {
    return activeSource.value.can_play_pause;
  }
  // Fall back to queue or player capabilities
  return queueCanPlay.value || playerCanPlay.value;
});

const isPlaying = computed(() => {
  return compProps.player?.playback_state == PlaybackState.PLAYING;
});

const isLoading = computed(() => {
  if (!compProps.player) return false;
  return (
    compProps.playerQueue?.extra_attributes?.play_action_in_progress === true
  );
});
</script>

<style>
/* Streamloader brand: primary action — teal circle */
.play-btn-icon {
  position: relative;
  border-radius: 50%;
  background-color: #0f766e; /* brand teal — light theme */
  color: var(--play-icon-color, #ffffff); /* on-primary glyph */
  box-shadow:
    0 4px 14px rgba(15, 118, 110, 0.35),
    0 0 0 1px rgba(15, 118, 110, 0.18);
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.play-btn-icon:hover {
  background-color: #0d6660; /* slightly darker teal on hover */
  box-shadow:
    0 6px 18px rgba(15, 118, 110, 0.45),
    0 0 0 1px rgba(15, 118, 110, 0.28);
  transform: translateY(-1px);
}

.play-btn-icon:active {
  transform: translateY(0);
  box-shadow:
    0 2px 8px rgba(15, 118, 110, 0.35),
    0 0 0 1px rgba(15, 118, 110, 0.22);
}

.v-theme--dark .play-btn-icon {
  background-color: #2dd4bf; /* brand teal — dark theme */
  color: var(--play-icon-color, #06342f); /* on-primary glyph (very dark teal) */
  box-shadow:
    0 4px 14px rgba(45, 212, 191, 0.35),
    0 0 0 1px rgba(45, 212, 191, 0.22);
}

.v-theme--dark .play-btn-icon:hover {
  background-color: #4ce0cc;
  box-shadow:
    0 6px 20px rgba(45, 212, 191, 0.5),
    0 0 0 1px rgba(45, 212, 191, 0.32);
}

.v-theme--dark .play-btn-icon:active {
  box-shadow:
    0 2px 8px rgba(45, 212, 191, 0.35),
    0 0 0 1px rgba(45, 212, 191, 0.26);
}

/* Disabled state — desaturate so it doesn't claim attention */
.play-btn-icon[disabled],
.play-btn-icon.disabled {
  background-color: rgba(15, 118, 110, 0.35);
  box-shadow: none;
  transform: none;
}

.v-theme--dark .play-btn-icon[disabled],
.v-theme--dark .play-btn-icon.disabled {
  background-color: rgba(45, 212, 191, 0.28);
  box-shadow: none;
}

.play-btn-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
  /* Teal-tinted buffering ring — matches brand */
  color: #0f766e;
}

.v-theme--dark .play-btn-spinner {
  color: #2dd4bf;
}
</style>
