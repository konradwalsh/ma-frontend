<template>
  <div :style="`width: ${width}px; height: 30px;`">
    <v-btn
      class="menu-btn-trigger"
      variant="tonal"
      :style="`
            width: ${width}px;
            position: absolute;
            border: 1px solid #cccccc4d;
            height: 38px;
            margin-top: -1px;
            margin-left: -1px;
          `"
      :disabled="loading"
      @click="emit('menu')"
    >
      <v-icon
        icon="mdi-menu-down"
        size="xx-large"
        :style="`width: 20px; margin-left: ${width - 42}px`"
      />
    </v-btn>

    <v-btn
      color="primary"
      flat
      :disabled="disabled || loading"
      :style="`width: ${width - 40}px; justify-content: left;`"
      :text="text"
      @click="emit('click')"
    >
      <template v-if="(icon && text!.length < 12) || loading" #prepend>
        <v-progress-circular
          v-if="loading"
          color="grey-lighten-5"
          indeterminate
        />
        <v-icon v-else :icon="icon" size="x-large" />
      </template>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
// properties
export interface Props {
  icon?: string;
  text?: string;
  disabled?: boolean;
  width?: number;
  loading?: boolean;
}
withDefaults(defineProps<Props>(), {
  icon: undefined,
  text: undefined,
  disabled: false,
  width: 200,
  loading: true,
});

// emitters
const emit = defineEmits<{
  (e: "click"): void;
  (e: "menu"): void;
}>();
</script>

<style scoped>
.menu-btn-trigger {
  transition:
    background-color 200ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 200ms ease,
    border-color 200ms ease;
}

.menu-btn-trigger:hover:not(:disabled) {
  background-color: rgba(45, 212, 191, 0.08) !important;
}

.menu-btn-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #2dd4bf;
}

@media (hover: none) {
  .menu-btn-trigger:hover:not(:disabled) {
    background-color: transparent !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-btn-trigger {
    transition: none;
  }
}
</style>
