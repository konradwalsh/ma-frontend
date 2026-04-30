<template>
  <v-timeline density="compact" side="end">
    <!-- Input -->
    <v-timeline-item
      :dot-color="isDotActive('input')"
      size="x-small"
      @click="handleSelect('input')"
    >
      <v-btn
        flat
        rounded="pill"
        :color="getButtonColor('input')"
        :class="getButtonClass('input')"
        class="dsp-pipeline-card"
      >
        <v-card-text class="px-3 py-1">{{
          $t("settings.dsp.input")
        }}</v-card-text>
      </v-btn>
    </v-timeline-item>

    <v-timeline-item :hide-dot="true" size="x-small" />

    <!-- DSP Filters -->
    <v-timeline-item
      v-for="(filter, index) in dsp.filters"
      :key="index"
      :dot-color="isDotActive(index)"
      size="x-small"
      :hide-dot="isDisabled(index)"
      @click="handleSelect(index)"
      @contextmenu.prevent="(e: MouseEvent) => openFilterContextMenu(e, index)"
    >
      <v-btn
        flat
        rounded="pill"
        :color="getButtonColor(index)"
        :class="getButtonClass(index)"
        class="dsp-pipeline-card"
      >
        <v-card-text class="px-3 py-1">{{
          $t(`settings.dsp.types.${filter.type}`)
        }}</v-card-text>
      </v-btn>
    </v-timeline-item>

    <!-- Add Filter Button -->
    <v-timeline-item dot-color="secondary" size="x-small" :hide-dot="true">
      <v-btn
        outlined
        rounded="pill"
        class="dsp-pipeline-card add-filter-btn"
        :elevation="0"
        @click="emit('onAddFilter')"
      >
        <v-card-text class="py-1 d-flex align-center">
          <v-icon size="small" class="mr-1">mdi-plus</v-icon>
          {{ $t("settings.dsp.filter.add") }}
        </v-card-text>
      </v-btn>
    </v-timeline-item>

    <v-timeline-item :hide-dot="true" size="x-small" />

    <!-- Output -->
    <v-timeline-item
      :dot-color="isDotActive('output')"
      size="x-small"
      @click="handleSelect('output')"
    >
      <v-btn
        flat
        rounded="pill"
        :color="getButtonColor('output')"
        :class="getButtonClass('output')"
        class="dsp-pipeline-card"
      >
        <v-card-text class="px-3 py-1">{{
          $t("settings.dsp.output")
        }}</v-card-text>
      </v-btn>
    </v-timeline-item>
  </v-timeline>
</template>

<script setup lang="ts">
import { DSPConfig } from "@/plugins/api/interfaces";
import { eventbus } from "@/plugins/eventbus";
import { useTheme } from "vuetify";

const theme = useTheme();

type SelectionType = number | "input" | "output";

const props = defineProps<{
  dsp: DSPConfig;
  selected: SelectionType | null;
}>();

const emit = defineEmits<{
  (e: "onSelect", selected: SelectionType): void;
  (e: "onAddFilter"): void;
  (e: "onMoveFilter", data: { index: number; direction: "up" | "down" }): void;
  (e: "onDeleteFilter", index: number): void;
}>();

const isDotActive = (value: SelectionType): string =>
  props.selected === value ? "primary" : "secondary";

const isDisabled = (value: SelectionType): boolean => {
  if (value === "input" || value === "output") {
    return false;
  } else {
    return !props.dsp.filters[value].enabled;
  }
};

const getButtonColor = (value: SelectionType): string => {
  if (props.selected === value) {
    return "primary";
  }
  return theme.global.current.value.dark ? "grey-darken-3" : "grey-lighten-3";
};

const getButtonClass = (value: SelectionType) => ({
  "filter-selected": props.selected === value,
});

const handleSelect = (value: SelectionType): void => {
  emit("onSelect", value);
};

const moveFilter = (index: number, direction: "up" | "down"): void => {
  emit("onMoveFilter", { index, direction });
};

const deleteFilter = (index: number): void => {
  emit("onDeleteFilter", index);
};

const openFilterContextMenu = function (evt: Event, index: number) {
  const menuItems = [
    {
      label: "settings.dsp.move_up",
      labelArgs: [],
      action: () => {
        moveFilter(index, "up");
      },
      disabled: index === 0,
      icon: "mdi-arrow-up",
    },
    {
      label: "settings.dsp.move_down",
      labelArgs: [],
      action: () => {
        moveFilter(index, "down");
      },
      disabled: index === props.dsp.filters.length - 1,
      icon: "mdi-arrow-down",
    },
    {
      label: "settings.dsp.delete_filter",
      labelArgs: [],
      action: () => {
        deleteFilter(index);
      },
      icon: "mdi-delete",
    },
  ];
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: (evt as PointerEvent).clientX,
    posY: (evt as PointerEvent).clientY,
  });
};
</script>

<style scoped>
.dsp-pipeline-card {
  min-width: 160px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  font-variant-numeric: tabular-nums;
}

.dsp-pipeline-card:hover,
.filter-selected {
  transform: translateX(4px);
}

/* Brand teal glow on the currently-edited filter card */
.filter-selected {
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.55),
    0 0 14px rgba(45, 212, 191, 0.35);
}

.v-theme--light .filter-selected {
  box-shadow:
    0 0 0 1px rgba(15, 118, 110, 0.55),
    0 0 12px rgba(15, 118, 110, 0.25);
}

/* Subtle teal hover hint on non-selected pipeline cards */
.dsp-pipeline-card:not(.filter-selected):hover {
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.3);
}

.v-theme--light .dsp-pipeline-card:not(.filter-selected):hover {
  box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.3);
}

.add-filter-btn {
  background: transparent;
  border: 1px dashed rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.v-theme--dark .add-filter-btn {
  border-color: rgba(255, 255, 255, 0.5);
}

.add-filter-btn:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: none;
  box-shadow: 0 0 12px rgba(45, 212, 191, 0.25);
}
</style>
