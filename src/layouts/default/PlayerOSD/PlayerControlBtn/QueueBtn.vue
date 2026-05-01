<template>
  <Button
    v-if="isVisible"
    variant="icon"
    :ripple="false"
    icon
    v-bind="$attrs"
    :disabled="
      !store.activePlayerId ||
      (store.showFullscreenPlayer &&
        !store.curQueueItem &&
        !store.showQueueItems)
    "
    :color="activeColor"
    :class="{ 'queue-btn': true, 'queue-btn--active': isActive }"
    :title="$t('queue')"
    :aria-label="$t('queue')"
    :aria-pressed="isActive"
    @click="onClick"
  >
    <ListVideo :size="size" aria-hidden="true" />
  </Button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });
import Button from "@/components/Button.vue";
import { store } from "@/plugins/store";
import { ListVideo } from "lucide-vue-next";
import { computed } from "vue";

export interface Props {
  isVisible?: boolean;
  size?: number;
}

withDefaults(defineProps<Props>(), {
  isVisible: true,
  size: 20,
});

const isActive = computed(
  () => store.showFullscreenPlayer && store.showQueueItems,
);

const activeColor = computed(() => (isActive.value ? "primary" : undefined));

const onClick = function () {
  if (store.showFullscreenPlayer && store.showQueueItems) {
    store.showQueueItems = false;
  } else if (store.showFullscreenPlayer && !store.showQueueItems) {
    store.showQueueItems = true;
  } else {
    store.showQueueItems = true;
    store.showFullscreenPlayer = true;
  }
};
</script>

<style scoped>
.queue-btn {
  transition:
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 220ms ease,
    background-color 180ms ease,
    color 180ms ease;
  border-radius: 12px;
}

.queue-btn:hover:not(:disabled) {
  background-color: rgba(45, 212, 191, 0.12);
}

.queue-btn--active {
  transform: scale(1.08);
  background-color: rgba(45, 212, 191, 0.18);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.45),
    0 0 14px 2px rgba(45, 212, 191, 0.55),
    0 0 28px 4px rgba(45, 212, 191, 0.25);
}

.queue-btn--active:hover:not(:disabled) {
  background-color: rgba(45, 212, 191, 0.26);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.6),
    0 0 18px 3px rgba(45, 212, 191, 0.65),
    0 0 32px 6px rgba(45, 212, 191, 0.32);
}

:global(.v-theme--light) .queue-btn:hover:not(:disabled) {
  background-color: rgba(15, 118, 110, 0.1);
}

:global(.v-theme--light) .queue-btn--active {
  background-color: rgba(15, 118, 110, 0.14);
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.45),
    0 0 12px 2px rgba(15, 118, 110, 0.4),
    0 0 24px 4px rgba(15, 118, 110, 0.18);
}

:global(.v-theme--light) .queue-btn--active:hover:not(:disabled) {
  background-color: rgba(15, 118, 110, 0.2);
}
</style>
