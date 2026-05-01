<script setup lang="ts">
import Button from "@/components/Button.vue";
import api from "@/plugins/api";
import { type MediaItemType } from "@/plugins/api/interfaces";

interface Props {
  item: MediaItemType;
}

const props = defineProps<Props>();
</script>

<template>
  <Button
    v-bind="props"
    variant="icon"
    :icon="item?.favorite ? 'mdi-heart' : 'mdi-heart-outline'"
    :title="$t('tooltip.favorite')"
    :aria-label="$t('tooltip.favorite')"
    :aria-pressed="!!item?.favorite"
    :class="{ 'favorite-btn': true, 'favorite-btn--active': !!item?.favorite }"
    @click="api.toggleFavorite(item)"
    @click.prevent
    @click.stop
  />
</template>

<style scoped>
.favorite-btn :deep(.v-icon) {
  transition:
    transform 320ms cubic-bezier(0.34, 1.36, 0.64, 1),
    color 200ms ease,
    filter 200ms ease;
}

.favorite-btn--active :deep(.v-icon) {
  color: rgb(45, 212, 191);
  animation: favorite-pop 360ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.favorite-btn:hover :deep(.v-icon) {
  color: rgb(45, 212, 191);
  filter: drop-shadow(0 0 6px rgba(45, 212, 191, 0.55));
  transform: scale(1.08);
}

.favorite-btn:focus-visible {
  outline: 2px solid rgb(45, 212, 191);
  outline-offset: 2px;
  border-radius: 50%;
}

@keyframes favorite-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@media (hover: none) {
  .favorite-btn:hover :deep(.v-icon) {
    transform: none;
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .favorite-btn :deep(.v-icon),
  .favorite-btn--active :deep(.v-icon),
  .favorite-btn:hover :deep(.v-icon) {
    transition: none;
    animation: none;
    transform: none;
    filter: none;
  }
}
</style>
