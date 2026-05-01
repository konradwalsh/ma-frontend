<template>
  <section
    v-if="dsp"
    class="dsp-section"
    :class="{ 'dsp-section--enabled': dsp.enabled }"
  >
    <v-toolbar color="transparent" class="border-b pr-4 dsp-toolbar">
      <v-switch
        v-model="dsp.enabled"
        hide-details
        color="primary"
        class="pl-4 dsp-enable-switch"
      />
      <v-toolbar-title class="dsp-toolbar-title">{{
        $t("settings.dsp.configure_on", { name: playerName })
      }}</v-toolbar-title>
      <v-menu offset-y transition="slide-y-transition">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            class="mr-4 dsp-preset-btn"
            :class="getButtonClass()"
          >
            <v-icon class="p-0 ms-md-n1 me-md-2"> mdi-tray-arrow-down </v-icon>
            <span class="d-none d-md-inline">
              {{ $t("settings.dsp.presets.load") }}
            </span>
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-if="dspPresets.length === 0">
            <v-list-item-title>
              {{ $t("settings.dsp.presets.empty_warning") }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item
            v-for="preset in dspPresets"
            v-else
            :key="preset.preset_id"
            @click="loadPreset(preset)"
          >
            <v-list-item-title>{{ preset.name }}</v-list-item-title>
            <template #append>
              <v-btn
                icon="mdi-delete"
                variant="text"
                density="compact"
                @click.stop="confirmRemovePreset(preset.preset_id)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn
        :class="getButtonClass()"
        class="dsp-preset-btn"
        @click="showSavePresetDialog = true"
      >
        <v-icon class="p-0 ms-md-n1 me-md-2"> mdi-content-save </v-icon>
        <span class="d-none d-md-inline">
          {{ $t("settings.dsp.presets.save") }}
        </span>
      </v-btn>
    </v-toolbar>

    <v-container class="pa-4">
      <v-alert
        v-if="!dsp.enabled"
        type="info"
        class="mt-4 dsp-disabled-alert"
        color="transparent"
      >
        {{ $t("settings.dsp.disabled_message") }}
      </v-alert>
      <v-row :class="{ 'justify-center': mobile }" class="flex-nowrap">
        <!-- Timeline Column -->
        <v-col
          v-if="!mobile || selectedStage === null"
          class="flex-grow-0 flex-shrink-0"
          :class="{ 'border-e pr-4': !mobile }"
          align-self="start"
        >
          <DSPPipeline
            :dsp="dsp"
            :selected="selectedStage"
            @on-select="selectStage"
            @on-add-filter="showAddFilterDialog = true"
            @on-move-filter="(d) => moveFilter(d.index, d.direction)"
            @on-delete-filter="removeFilter"
          />
        </v-col>

        <!-- Filter Settings Panel -->
        <v-col v-if="selectedStage != null" style="min-width: 0">
          <!-- Toolbar of the selected item -->
          <v-toolbar
            density="compact"
            :color="$vuetify.theme.current.dark ? 'surface' : 'surface-light'"
            class="border-b"
          >
            <v-btn
              v-if="mobile"
              class="hidden-xs-only"
              icon
              @click="selectedStage = null"
            >
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <v-toolbar-title>{{ stageTitle(selectedStage) }}</v-toolbar-title>
            <v-btn
              v-if="
                typeof selectedStage === 'number' &&
                !mobile &&
                selectedStage > 0
              "
              icon
              @click="moveFilter(selectedStage, 'up')"
            >
              <v-icon>mdi-arrow-up</v-icon>
            </v-btn>
            <v-btn
              v-if="
                typeof selectedStage === 'number' &&
                !mobile &&
                selectedStage < dsp.filters.length - 1
              "
              icon
              @click="moveFilter(selectedStage, 'down')"
            >
              <v-icon>mdi-arrow-down</v-icon>
            </v-btn>

            <v-switch
              v-if="typeof selectedStage === 'number'"
              v-model="dsp.filters[selectedStage].enabled"
              hide-details
              color="primary"
              class="mr-4"
            />
            <v-btn
              v-if="typeof selectedStage === 'number'"
              icon
              @click="removeFilter(selectedStage)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-toolbar>

          <!-- Settings of the Input stage -->
          <v-card
            v-if="selectedStage === 'input'"
            flat
            :color="$vuetify.theme.current.dark ? 'surface' : 'surface-light'"
          >
            <DSPSlider v-model="dsp.input_gain" type="gain" />
          </v-card>

          <!-- Settings of the Output stage -->
          <v-card
            v-else-if="selectedStage === 'output'"
            flat
            :color="$vuetify.theme.current.dark ? 'surface' : 'surface-light'"
          >
            <DSPSlider v-model="dsp.output_gain" type="gain" />
          </v-card>

          <!-- Settings of the selected DSP Filter -->
          <v-card
            v-else
            flat
            :color="$vuetify.theme.current.dark ? 'surface' : 'surface-light'"
          >
            <DSPParametricEQ
              v-if="
                dsp.filters[selectedStage].type === DSPFilterType.PARAMETRIC_EQ
              "
              v-model="dsp.filters[selectedStage] as ParametricEQFilter"
            />
            <DSPToneControl
              v-if="
                dsp.filters[selectedStage].type === DSPFilterType.TONE_CONTROL
              "
              v-model="dsp.filters[selectedStage] as ToneControlFilter"
            />
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Save DSP Preset Dialog -->
    <v-dialog v-model="showSavePresetDialog" max-width="300">
      <v-card>
        <v-card-title>{{ $t("settings.dsp.presets.save") }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newPresetName"
            :label="$t('settings.dsp.presets.name')"
            :placeholder="$t('settings.dsp.presets.name_placeholder')"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="primary"
            @click="showSavePresetDialog = false"
          >
            {{ $t("cancel") }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!newPresetName.trim()"
            @click="savePreset"
          >
            {{ $t("settings.dsp.presets.save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Preset Confirm Dialog (warm amber, not raw red — keeps teal palette) -->
    <v-dialog v-model="showRemovePresetDialog" max-width="360">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="amber-darken-2" class="mr-2">mdi-alert-circle</v-icon>
          {{ $t("settings.dsp.presets.remove_confirm") }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="primary"
            @click="showRemovePresetDialog = false"
          >
            {{ $t("cancel") }}
          </v-btn>
          <v-btn
            color="amber-darken-2"
            variant="flat"
            @click="performRemovePreset"
          >
            {{ $t("settings.dsp.presets.remove") || $t("delete") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Filter Dialog -->
    <v-dialog v-model="showAddFilterDialog" max-width="300">
      <v-card>
        <v-card-title>{{ $t("settings.dsp.filter.add") }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="newFilterType"
            :items="filterTypes"
            :label="$t('settings.dsp.filter.type')"
            color="primary"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="primary"
            @click="showAddFilterDialog = false"
            >{{ $t("cancel") }}</v-btn
          >
          <v-btn color="primary" variant="flat" @click="addFilter">{{
            $t("settings.dsp.filter.add")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onUnmounted,
  onBeforeUnmount,
  onMounted,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useDisplay, useTheme } from "vuetify";
import { api } from "@/plugins/api";
import {
  DSPConfig,
  DSPConfigPreset,
  ParametricEQBandType,
  DSPFilter,
  DSPFilterType,
  ParametricEQFilter,
  ToneControlFilter,
  EventType,
} from "@/plugins/api/interfaces";
import { getPlayerName } from "@/helpers/utils";
import DSPPipeline from "@/components/dsp/DSPPipeline.vue";
import DSPSlider from "@/components/dsp/DSPSlider.vue";
import DSPParametricEQ from "@/components/dsp/DSPParametricEQ.vue";
import DSPToneControl from "@/components/dsp/DSPToneControl.vue";

const { t } = useI18n();
const router = useRouter();
const theme = useTheme();

const props = defineProps<{
  playerId?: string;
}>();

const dsp = ref<DSPConfig>();
const dspPresets = ref<DSPConfigPreset[]>([]);
const selectedStage = ref<number | null | "input" | "output">(null);
const showAddFilterDialog = ref(false);
const showSavePresetDialog = ref(false);
const newFilterType = ref(DSPFilterType.PARAMETRIC_EQ);
const newPresetName = ref("");
const windowWidth = ref(window.innerWidth);
const { mobile } = useDisplay();
let updatedFromServer = false;

let unsubPlayerDSP: (() => void) | undefined = undefined;

const filterTypes = Object.values(DSPFilterType).map((value) => {
  return {
    value: value,
    title: t(`settings.dsp.types.${value}`),
  };
});

// Methods
const getButtonClass = (): string => {
  return theme.global.current.value.dark
    ? "bg-grey-darken-3"
    : "bg-grey-lighten-3";
};

const selectStage = (index: number | "input" | "output") => {
  selectedStage.value = index;
};

const stageTitle = (index: number | "input" | "output") => {
  if (index === "input") return t("settings.dsp.input");
  if (index === "output") return t("settings.dsp.output");
  return t(`settings.dsp.types.${dsp.value?.filters[index].type}`);
};

const addFilter = () => {
  if (!dsp.value) return;

  let filter: DSPFilter;

  switch (newFilterType.value) {
    case DSPFilterType.PARAMETRIC_EQ:
      filter = {
        preamp: 0,
        per_channel_preamp: {},
        enabled: true,
        type: DSPFilterType.PARAMETRIC_EQ,
        bands: [],
      };
      break;
    case DSPFilterType.TONE_CONTROL:
      filter = {
        enabled: true,
        type: DSPFilterType.TONE_CONTROL,
        bass_level: 0,
        mid_level: 0,
        treble_level: 0,
      };
      break;
    default:
      return;
  }

  dsp.value.filters.push(filter);
  showAddFilterDialog.value = false;
  selectStage(dsp.value.filters.length - 1); // Select the newly added filter
};

const moveFilter = (index: number, direction: "up" | "down") => {
  if (!dsp.value) return;

  const newIndex = direction === "up" ? index - 1 : index + 1;

  if (newIndex < 0 || newIndex >= dsp.value.filters.length) return;

  const [movedFilter] = dsp.value.filters.splice(index, 1);
  dsp.value.filters.splice(newIndex, 0, movedFilter);

  if (selectedStage.value === index) {
    selectedStage.value = newIndex;
  } else if (selectedStage.value === newIndex) {
    selectedStage.value = index;
  }
};

const removeFilter = (index: number) => {
  if (selectedStage.value === index) selectedStage.value = "input";
  dsp.value?.filters.splice(index, 1);
};

const loadPreset = async (preset: DSPConfigPreset) => {
  if (!preset || !preset.config) return;

  selectedStage.value = "input";
  // Deep copy the preset config to avoid reference issues
  dsp.value = preset.config;
};

const savePreset = async () => {
  if (!dsp.value || !newPresetName.value.trim()) return;

  const preset: DSPConfigPreset = {
    name: newPresetName.value.trim(),
    config: dsp.value,
  };

  try {
    await api.saveDSPPreset(preset);
    newPresetName.value = "";
    showSavePresetDialog.value = false;
  } catch (error) {
    console.error("Failed to save DSP preset:", error);
  }
};

const showRemovePresetDialog = ref(false);
const presetIdToRemove = ref<string | undefined>(undefined);

const confirmRemovePreset = (presetId: string | undefined) => {
  if (!presetId) return;
  presetIdToRemove.value = presetId;
  showRemovePresetDialog.value = true;
};

const performRemovePreset = async () => {
  const presetId = presetIdToRemove.value;
  showRemovePresetDialog.value = false;
  presetIdToRemove.value = undefined;
  if (!presetId) return;
  await api.removeDSPPreset(presetId);
  dspPresets.value = dspPresets.value.filter((p) => p.preset_id !== presetId);
};

// Watchers

watch(
  mobile,
  (mobile) => {
    if (!mobile && selectedStage.value === null) {
      selectStage("input");
    }
  },
  { immediate: true },
);
const playerName = computed(() =>
  getPlayerName(api.players[props.playerId!], 27),
);

watch(
  () => props.playerId,
  async (val) => {
    if (unsubPlayerDSP) unsubPlayerDSP();
    // Don't overwrite the config for the newly selected player
    updatedFromServer = true;
    if (val) {
      dsp.value = await api.getDSPConfig(val);
    }
    unsubPlayerDSP = api.subscribe(
      EventType.PLAYER_DSP_CONFIG_UPDATED,
      (evt: { data: DSPConfig }) => {
        updatedFromServer = true;
        dsp.value = evt.data;
      },
      props.playerId,
    );
  },
  { immediate: true },
);

const unsubDSPPresets = api.subscribe(
  EventType.DSP_PRESETS_UPDATED,
  (evt: { data: DSPConfigPreset[] }) => {
    dspPresets.value = evt.data;
  },
);

onMounted(async () => {
  dspPresets.value = await api.getDSPPresets();
});

onBeforeUnmount(() => {
  if (unsubPlayerDSP) unsubPlayerDSP();
  unsubDSPPresets();
});

// Debounced save, to prevent too many requests, but still be responsive
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (newVal: DSPConfig) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (props.playerId) {
      await api.saveDSPConfig(props.playerId, newVal);
    }
  }, 2000);
};

watch(
  dsp,
  (newVal, oldVal) => {
    if (updatedFromServer) {
      // Skip resending, since we just got the config
      if (saveTimeout) clearTimeout(saveTimeout);
      updatedFromServer = false;
      return;
    }
    if (oldVal === null) return; // We haven't changed anything yet
    if (newVal) debouncedSave(newVal);
  },
  { deep: true },
);
</script>

<style scoped>
.dsp-section {
  transition: opacity 0.25s ease;
}

.dsp-section:not(.dsp-section--enabled) :deep(.v-row) {
  opacity: 0.78;
}

/* Toolbar polish */
.dsp-toolbar {
  border-bottom-color: rgba(var(--v-theme-primary), 0.18) !important;
}

.dsp-toolbar-title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.dsp-section--enabled .dsp-toolbar-title {
  color: rgb(var(--v-theme-primary));
}

.dsp-enable-switch {
  flex: 0 0 auto;
}

/* Preset buttons — let teal show through on hover */
.dsp-preset-btn {
  font-weight: 500;
  letter-spacing: 0.02em;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.dsp-preset-btn:hover {
  color: rgb(var(--v-theme-primary));
}

.dsp-preset-btn:hover .v-icon {
  color: rgb(var(--v-theme-primary));
}

/* Disabled-state alert subtler */
.dsp-disabled-alert {
  border: 1px dashed rgba(var(--v-theme-primary), 0.28);
  border-radius: 8px;
}

.dsp-disabled-alert :deep(.v-alert__prepend .v-icon) {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>
