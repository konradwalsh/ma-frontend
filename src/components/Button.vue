<template>
  <v-btn
    v-bind="buttonProps"
    :class="buttonClasses"
    @click="$emit('click', $event)"
  >
    <v-icon v-if="icon && typeof icon === 'string'" :icon="icon" />
    <template v-for="(_, name) in $slots" #[name]>
      <slot :name="name"></slot>
    </template>
  </v-btn>
</template>

<script lang="ts">
export type { ButtonEmits, ButtonProps } from "@/composables/useButton";
</script>

<script setup lang="ts">
import {
  defaultButtonProps,
  useButton,
  type ButtonEmits,
  type ButtonProps,
} from "@/composables/useButton";

const props = withDefaults(defineProps<ButtonProps>(), defaultButtonProps);

defineEmits<ButtonEmits>();

const { buttonProps, buttonClasses } = useButton(props);
</script>

<style scoped>
.button {
  transition:
    transform 200ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 200ms ease;
}

.button:focus-visible {
  outline: 2px solid rgb(45, 212, 191);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.25);
}

.button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.button:active:not(:disabled) {
  transform: translateY(0);
}

@media (hover: none) {
  .button:hover:not(:disabled) {
    transform: none;
  }
}

@media (prefers-contrast: high) {
  .button {
    border: 1px solid currentColor;
  }
}

@media (prefers-reduced-motion: reduce) {
  .button,
  .button:hover:not(:disabled),
  .button:active:not(:disabled) {
    transition: none;
    transform: none;
  }
}

.button--responsive {
  min-height: 48px;
  min-width: 48px;
}

.button--icon {
  min-height: 40px;
  min-width: 40px;
}

.button--icon :deep(.v-ripple__container) {
  border-radius: 50% !important;
  transform: scale(0.7) !important;
}

.button--icon :deep(.v-ripple__animation) {
  border-radius: 50% !important;
}

.button--nav {
  border-radius: 0;
}
</style>
