<template>
  <v-card flat color="transparent" class="dsp-slider-card">
    <v-card-text class="d-flex align-center gap-4">
      <span style="min-width: 100px" class="v-label pl-2">{{
        config.label
      }}</span>
      <v-slider
        v-model="sliderModel"
        :min="sliderMin"
        :max="sliderMax"
        :step="sliderStep"
        hide-details
        class="flex-grow-1 pr-4 dsp-slider"
        density="compact"
        color="primary"
        track-color="surface-variant"
      />
      <v-text-field
        v-model="displayValue"
        type="number"
        hide-details
        density="compact"
        variant="outlined"
        style="max-width: 100px"
        class="dsp-slider-value"
        @focus="isEditing = true"
        @blur="isEditing = false"
      />
      <span style="min-width: 40px" class="pl-2 dsp-slider-unit">{{
        config.unit
      }}</span>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { $t } from "@/plugins/i18n";
import { ref, computed } from "vue";

type ParameterConfig = {
  // Minimum value for the slider
  min: number;
  // Maximum value for the slider
  max: number;
  // Step increment for the slider
  step: number;
  label: string;
  unit: string;
  // Whether the slider should behave logarithmically
  is_log: boolean;
};

const props = defineProps<{
  type: "gain" | "q" | "frequency" | ParameterConfig;
}>();

const model = defineModel<number>({ required: true });
const isEditing = ref(false);

const config = computed((): ParameterConfig => {
  if (props.type === "gain") {
    return {
      min: -15,
      max: 15,
      step: 0.1,
      label: $t("settings.dsp.parameter.gain"),
      unit: "dB",
      is_log: false,
    };
  } else if (props.type === "q") {
    return {
      min: 0.1,
      max: 20,
      step: 0.1,
      label: $t("settings.dsp.parameter.q_factor"),
      unit: "",
      is_log: false,
    };
  } else if (props.type === "frequency") {
    return {
      min: 20,
      max: 20000,
      step: 1,
      label: $t("settings.dsp.parameter.frequency"),
      unit: "Hz",
      is_log: true,
    };
  } else {
    return props.type;
  }
});

// Computed property for compact display of the value
const displayValue = computed({
  get: () => {
    if (isEditing.value) {
      return model.value.toString();
    }
    if (model.value > 1000) return model.value.toFixed(0);
    if (model.value > 100) return model.value.toFixed(1);
    return model.value.toFixed(2);
  },
  set: (value: string) => {
    model.value = Number(value);
  },
});

// Computed properties for the slider model
const sliderModel = computed({
  get: () => {
    if (config.value.is_log) {
      return Math.log10(model.value);
    } else {
      return model.value;
    }
  },
  set: (value: number) => {
    if (config.value.is_log) {
      model.value = Math.pow(10, value);
    } else {
      model.value = value;
    }
  },
});
const sliderMax = computed(() => {
  if (config.value.is_log) {
    return Math.log10(config.value.max);
  } else {
    return config.value.max;
  }
});
const sliderMin = computed(() => {
  if (config.value.is_log) {
    return Math.log10(config.value.min);
  } else {
    return config.value.min;
  }
});
const sliderStep = computed(() => {
  if (config.value.is_log) {
    return Math.log10(config.value.step);
  } else {
    return config.value.step;
  }
});
</script>

<style scoped>
/* Tabular numerals so the dB/Hz/Q values don't shift width while dragging */
.dsp-slider-value :deep(input) {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.dsp-slider-unit {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  font-size: 0.85em;
}

/* Subtle teal glow on the active slider thumb (keeps Vuetify primary fill) */
.dsp-slider :deep(.v-slider-thumb__surface) {
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.4);
}

.v-theme--light .dsp-slider :deep(.v-slider-thumb__surface) {
  box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.4);
}

.dsp-slider :deep(.v-slider-thumb:hover .v-slider-thumb__surface),
.dsp-slider :deep(.v-slider-thumb--focused .v-slider-thumb__surface) {
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.6),
    0 0 12px rgba(45, 212, 191, 0.35);
}

.v-theme--light .dsp-slider :deep(.v-slider-thumb:hover .v-slider-thumb__surface),
.v-theme--light .dsp-slider :deep(.v-slider-thumb--focused .v-slider-thumb__surface) {
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.55),
    0 0 10px rgba(15, 118, 110, 0.3);
}
</style>
