<template>
  <!-- repeat button -->
  <Icon
    v-if="isVisible && playerQueue"
    v-bind="{ ...icon, ...$attrs }"
    :class="{
      'sl-toggle-active': isRepeatActive,
      'sl-toggle-active--one': playerQueue.repeat_mode == RepeatMode.ONE,
    }"
    :disabled="
      !playerQueue.active ||
      playerQueue.items == 0 ||
      isLoading ||
      isSingleDynamicPlaylist
    "
    :color="
      getValueFromSources(icon?.color, [
        [playerQueue.repeat_mode == RepeatMode.OFF, undefined],
        [playerQueue.repeat_mode == RepeatMode.ALL, 'primary'],
        [playerQueue.repeat_mode == RepeatMode.ONE, 'primary'],
      ])
    "
    variant="button"
    @click="
      api.queueCommandRepeat(
        playerQueue.queue_id || '',
        getValueFromSources(undefined as RepeatMode | undefined, [
          [playerQueue.repeat_mode == RepeatMode.OFF, RepeatMode.ALL],
          [playerQueue.repeat_mode == RepeatMode.ALL, RepeatMode.ONE],
          [playerQueue.repeat_mode == RepeatMode.ONE, RepeatMode.OFF],
        ]) ?? RepeatMode.OFF,
      )
    "
  >
    <IconRepeatOff
      v-if="playerQueue.repeat_mode == RepeatMode.OFF"
      :size="size"
    />
    <IconRepeat
      v-else-if="playerQueue.repeat_mode == RepeatMode.ALL"
      :size="size"
    />
    <IconRepeatOnce v-else :size="size" />
  </Icon>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import Icon, { IconProps } from "@/components/Icon.vue";
import { getValueFromSources } from "@/helpers/utils";
import api from "@/plugins/api";
import { PlayerQueue, RepeatMode } from "@/plugins/api/interfaces";
import { isQueueDynamicPlaylist } from "@/plugins/api/helpers";
import { computed } from "vue";
import { IconRepeat, IconRepeatOff, IconRepeatOnce } from "@tabler/icons-vue";

// properties
export interface Props {
  playerQueue: PlayerQueue | undefined;
  isVisible?: boolean;
  icon?: IconProps;
  size?: number;
}
const compProps = withDefaults(defineProps<Props>(), {
  isVisible: true,
  icon: undefined,
  size: 20,
});

const isLoading = computed(() => {
  return (
    compProps.playerQueue?.extra_attributes?.play_action_in_progress === true
  );
});

const isSingleDynamicPlaylist = computed(() =>
  isQueueDynamicPlaylist(compProps.playerQueue),
);

const isRepeatActive = computed(
  () => compProps.playerQueue?.repeat_mode !== RepeatMode.OFF,
);
</script>

<style scoped>
/* Subtle teal halo when repeat is ALL or ONE. Brand teal: #2dd4bf dark / #0f766e light.
   ONE is already visually distinct via the IconRepeatOnce glyph (built-in "1"),
   so we just add a slightly tighter, brighter halo to emphasize the single-track loop. */
.sl-toggle-active {
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.35),
    0 0 10px 2px rgba(45, 212, 191, 0.28);
  transition:
    box-shadow 180ms ease-out,
    background-color 180ms ease-out;
}

.v-theme--light .sl-toggle-active {
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.4),
    0 0 10px 2px rgba(15, 118, 110, 0.22);
}

.sl-toggle-active:hover {
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.5),
    0 0 14px 3px rgba(45, 212, 191, 0.4);
}

.v-theme--light .sl-toggle-active:hover {
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.55),
    0 0 14px 3px rgba(15, 118, 110, 0.32);
}

/* Tighter, more saturated halo for the ONE state to reinforce the
   "looping a single track" semantic. */
.sl-toggle-active--one {
  box-shadow:
    0 0 0 1.5px rgba(45, 212, 191, 0.55),
    0 0 12px 2px rgba(45, 212, 191, 0.45);
}

.v-theme--light .sl-toggle-active--one {
  box-shadow:
    0 0 0 1.5px rgba(15, 118, 110, 0.6),
    0 0 12px 2px rgba(15, 118, 110, 0.35);
}

.sl-toggle-active--one:hover {
  box-shadow:
    0 0 0 1.5px rgba(45, 212, 191, 0.7),
    0 0 16px 3px rgba(45, 212, 191, 0.55);
}

.v-theme--light .sl-toggle-active--one:hover {
  box-shadow:
    0 0 0 1.5px rgba(15, 118, 110, 0.75),
    0 0 16px 3px rgba(15, 118, 110, 0.45);
}
</style>
