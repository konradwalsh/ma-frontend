<template>
  <PlayerTrackMenu v-if="contextMenu && contextMenu.isVisible" />

  <div class="extended-controls-cluster">
    <ActivePlayerPopover
      v-if="!store.mobileLayout && player && player.isVisible"
      auto-show
      align="end"
      child-element-id="extended-controls-speaker-button"
    />
    <SpeakerBtn id="extended-controls-speaker-button" :color="player.color" />

    <QueueBtn
      v-if="queue && queue.isVisible"
      :color="queue.color"
      style="padding-right: 5px"
    />
    <PlayerVolume
      v-if="volume && volume.isVisible && store.activePlayer"
      :player="store.activePlayer"
      :width="volume.volumeSize || '150px'"
      :allow-wheel="true"
      :prefer-group-volume="true"
    />
  </div>
</template>

<script setup lang="ts">
import ActivePlayerPopover from "@/components/ActivePlayerPopover.vue";
import { store } from "@/plugins/store";
import PlayerTrackMenu from "./PlayerControlBtn/PlayerTrackMenu.vue";
import QueueBtn from "./PlayerControlBtn/QueueBtn.vue";
import SpeakerBtn from "./PlayerControlBtn/SpeakerBtn.vue";
import PlayerVolume from "./PlayerVolume.vue";

// properties
export interface Props {
  // eslint-disable-next-line vue/require-default-prop
  queue?: {
    isVisible?: boolean;
    showQueueDialog?: boolean;
    color?: string;
  };
  player?: {
    isVisible?: boolean;
    color?: string;
  };
  volume?: {
    isVisible?: boolean;
    volumeSize?: string;
    responsiveVolumeSize?: boolean;
    color?: string;
  };
  contextMenu?: {
    isVisible?: boolean;
  };
}

withDefaults(defineProps<Props>(), {
  queue: () => ({ isVisible: true, showQueueDialog: false }),
  player: () => ({ isVisible: true }),
  volume: () => ({
    isVisible: true,
    volumeSize: "150px",
    responsiveVolumeSize: false,
  }),
  contextMenu: () => ({ isVisible: true }),
});
</script>

<style scoped>
.extended-controls-cluster {
  display: contents;
}

/* Subtle teal hover background tint on icon buttons within this cluster.
   The cluster uses display: contents so layout is unchanged. */
.extended-controls-cluster :deep(button.v-btn) {
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.extended-controls-cluster :deep(button.v-btn:hover) {
  background-color: rgba(45, 212, 191, 0.1);
}

/* Active-state teal glow: when a button is rendered with the primary color
   (e.g. QueueBtn when the queue panel is open in fullscreen), give it a
   soft teal outer glow so the on-state reads at a glance. */
.extended-controls-cluster :deep(button.v-btn.text-primary),
.extended-controls-cluster :deep(button.v-btn.bg-primary) {
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.35),
    0 0 12px rgba(45, 212, 191, 0.25);
}

.extended-controls-cluster :deep(button.v-btn.text-primary:hover),
.extended-controls-cluster :deep(button.v-btn.bg-primary:hover) {
  background-color: rgba(45, 212, 191, 0.16);
}
</style>
