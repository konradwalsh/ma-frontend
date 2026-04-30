<template>
  <!-- shuffle button -->
  <Icon
    v-if="isVisible && playerQueue"
    v-bind="{ ...icon, ...$attrs }"
    :class="{ 'sl-toggle-active': playerQueue.shuffle_enabled }"
    :disabled="
      !playerQueue.active ||
      playerQueue.items == 0 ||
      isLoading ||
      isSingleDynamicPlaylist
    "
    :color="
      getValueFromSources(icon?.color, [
        [playerQueue.shuffle_enabled, 'primary', ''],
      ])
    "
    variant="button"
    role="button"
    :aria-label="$t('shuffle')"
    :aria-pressed="!!playerQueue.shuffle_enabled"
    @click="
      api.queueCommandShuffle(
        playerQueue.queue_id,
        playerQueue.shuffle_enabled ? false : true,
      )
    "
  >
    <Shuffle v-if="playerQueue.shuffle_enabled" :size="size" aria-hidden="true" />
    <IconArrowsRight v-else :size="size" aria-hidden="true" />
  </Icon>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import Icon, { IconProps } from "@/components/Icon.vue";
import { getValueFromSources } from "@/helpers/utils";
import api from "@/plugins/api";
import { PlayerQueue } from "@/plugins/api/interfaces";
import { isQueueDynamicPlaylist } from "@/plugins/api/helpers";
import { IconArrowsRight } from "@tabler/icons-vue";
import { Shuffle } from "lucide-vue-next";
import { computed } from "vue";

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
</script>

<style scoped>
/* Subtle teal halo when shuffle is enabled. Brand teal: #2dd4bf dark / #0f766e light. */
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
</style>
