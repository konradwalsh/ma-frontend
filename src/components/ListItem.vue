<template>
  <v-list-item
    v-hold="(v: Event) => $emit('menu', v)"
    v-bind="listItemProps"
    :class="listItemClasses"
    @click="$emit('click', $event)"
    @click.right.prevent="(v: Event) => $emit('menu', v)"
    @input="(v: Event) => $emit('input', v)"
  >
    <template v-for="(_, name) in $slots" #[name]>
      <slot :name="name"></slot>
    </template>
    <template v-if="$slots.append || showMenuBtn" #append>
      <slot name="append"></slot>
      <Button
        v-if="showMenuBtn"
        variant="icon"
        icon="mdi-dots-vertical"
        aria-label="Show context menu"
        @click.stop="(v: Event) => $emit('menu', v)"
      />
    </template>
  </v-list-item>
</template>

<script lang="ts">
export type { ListItemEmits, ListItemProps } from "@/composables/useListItem";
</script>

<script setup lang="ts">
import Button from "@/components/Button.vue";
import {
  defaultListItemProps,
  useListItem,
  type ListItemEmits,
  type ListItemProps,
} from "@/composables/useListItem";

const props = withDefaults(defineProps<ListItemProps>(), defaultListItemProps);

defineEmits<ListItemEmits>();

const { listItemProps, listItemClasses } = useListItem(props);
</script>

<style scoped>
.list-item-main {
  border-radius: 4px !important;
  padding: 7px !important;
  padding-right: 0 !important;
  margin-right: -18px !important;
  /* Brand polish: smooth wash + stripe transitions */
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease;
  letter-spacing: 0.005em;
}

/* Teal hover wash (brand: #2dd4bf) */
.list-item-main:hover {
  background-color: rgba(45, 212, 191, 0.08);
}

/* Active row left-edge stripe in brand teal */
.list-item-main.v-list-item--active,
.list-item-main:global(.v-list-item--active) {
  box-shadow: inset 3px 0 0 #2dd4bf;
}

/* Keyboard focus ring (focus-visible only — no mouse rings) */
.list-item-main:focus-visible {
  outline: none;
  box-shadow:
    inset 3px 0 0 #2dd4bf,
    0 0 0 2px rgba(45, 212, 191, 0.55);
}

/* Touch devices: suppress hover wash so tap doesn't leave a stuck tint */
@media (hover: none) {
  .list-item-main:hover {
    background-color: transparent;
  }
}

/* On-brand styling for any inline badge/chip indicators */
.list-item-main :deep(.v-chip),
.list-item-main :deep(.v-badge__badge) {
  letter-spacing: 0.02em;
  font-weight: 500;
}

.list-item-main :deep(.v-list-item__append) {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0;
}

.list-item-main :deep(.v-list-item__prepend .v-icon) {
  margin-inline-end: 5px !important;
}

.list-item-main :deep(.v-list-item__prepend > div) {
  display: flex !important;
  align-items: center !important;
}

.list-item-main :deep(.v-list-item__content > div) {
  padding-left: 4px;
  padding-right: 10px;
}

.list-item--compact {
  padding: 4px;
}

.list-item--comfortable {
  padding: 12px;
}
</style>
