<!--
  SLToggleRow.vue

  Single label + description + v-switch row, used five times by
  StreamloaderSettings.vue. Lives under views/settings/streamloader/ so
  the parent stays at views/settings/StreamloaderSettings.vue alongside
  the other settings landing pages — only the helper got nested. Pure
  presentational; no localStorage logic, parent owns the state.
-->
<template>
  <div class="sl-toggle-row">
    <div class="sl-toggle-row__text">
      <div class="sl-toggle-row__label">{{ label }}</div>
      <div v-if="description" class="sl-toggle-row__desc">
        {{ description }}
      </div>
    </div>
    <v-switch
      :model-value="modelValue"
      color="primary"
      density="compact"
      hide-details
      inset
      class="sl-toggle-row__switch"
      @update:model-value="onChange"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  description?: string;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

// v-switch can emit `null` for indeterminate / unset states; coerce to a
// real boolean so consumers (which write to localStorage) never see null.
const onChange = (value: boolean | null) => {
  emit("update:modelValue", value === true);
};
</script>

<style scoped>
.sl-toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  justify-content: space-between;
}

.sl-toggle-row__text {
  flex: 1;
  min-width: 0;
}

.sl-toggle-row__label {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 4px;
}

.sl-toggle-row__desc {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.45;
}

.sl-toggle-row__switch {
  flex: 0 0 auto;
  margin-top: 2px;
  /* Vuetify's v-switch default applies inline padding that wastes
     horizontal space inside our flex row. Trim it so the switch sits
     flush against the right edge of the parent card. */
  padding-inline-end: 0;
}

.sl-toggle-row__switch :deep(.v-selection-control) {
  min-height: 0;
}

.sl-toggle-row__switch :deep(.v-switch__track) {
  /* Brand-teal focus ring, matching the rest of the streamloader
     surfaces. Vuetify draws focus on the parent input. */
  outline-offset: 2px;
}

.sl-toggle-row__switch :deep(.v-switch__track:focus-visible),
.sl-toggle-row__switch:focus-within :deep(.v-switch__track) {
  outline: 2px solid #2dd4bf;
}
</style>
