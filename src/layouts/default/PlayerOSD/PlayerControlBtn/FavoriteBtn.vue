<template>
  <Icon
    v-if="isVisible"
    v-bind="props.icon"
    class="sl-favorite-btn"
    :class="{ 'sl-favorite-btn--active': item?.favorite }"
    :color="item?.favorite ? 'primary' : props.icon?.color"
    :disabled="disabled || !item"
    :icon="item?.favorite ? 'mdi-heart' : 'mdi-heart-outline'"
    :title="tooltipLabel"
    variant="button"
    role="button"
    :aria-label="$t('tooltip.favorite')"
    :aria-keyshortcuts="shortcutKey || undefined"
    :aria-pressed="!!item?.favorite"
    :aria-disabled="disabled || !item"
    @click="onClick"
  />
</template>

<script setup lang="ts">
import Icon, { IconProps } from "@/components/Icon.vue";
import api from "@/plugins/api";
import { type MediaItemType } from "@/plugins/api/interfaces";
import { getShortcutKeyFor } from "@/composables/useKeyboardShortcuts";
import { useI18n } from "vue-i18n";
import { computed } from "vue";

// properties
export interface Props {
  item?: MediaItemType;
  isVisible?: boolean;
  icon?: IconProps;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  item: undefined,
  isVisible: true,
  icon: undefined,
  disabled: false,
});

const onClick = function () {
  if (!props.item) return;
  api.toggleFavorite(props.item);
};

// Streamloader-fork: passive shortcut hint sourced from KEYBOARD_SHORTCUTS.
const { t } = useI18n();
const shortcutKey = getShortcutKeyFor("favorite");
const tooltipLabel = computed(() => {
  const base = t("tooltip.favorite");
  return shortcutKey ? `${base} (${shortcutKey})` : base;
});
</script>

<style scoped>
/* Brand teal: #2dd4bf dark / #0f766e light. */

/* Hover affordance: subtle teal tint on hover regardless of favorite state. */
.sl-favorite-btn {
  border-radius: 50%;
  transition:
    box-shadow 180ms ease-out,
    background-color 180ms ease-out;
}

.sl-favorite-btn:not(:disabled):hover {
  background-color: rgba(45, 212, 191, 0.12);
}

.v-theme--light .sl-favorite-btn:not(:disabled):hover {
  background-color: rgba(15, 118, 110, 0.1);
}

/* Active (favorited) state: teal-filled heart already gets color="primary";
   add a small teal glow halo for emphasis. */
.sl-favorite-btn--active {
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.35),
    0 0 10px 2px rgba(45, 212, 191, 0.3);
}

.v-theme--light .sl-favorite-btn--active {
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.4),
    0 0 10px 2px rgba(15, 118, 110, 0.22);
}

.sl-favorite-btn--active:not(:disabled):hover {
  background-color: rgba(45, 212, 191, 0.16);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.5),
    0 0 14px 3px rgba(45, 212, 191, 0.42);
}

.v-theme--light .sl-favorite-btn--active:not(:disabled):hover {
  background-color: rgba(15, 118, 110, 0.14);
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.55),
    0 0 14px 3px rgba(15, 118, 110, 0.32);
}
</style>
