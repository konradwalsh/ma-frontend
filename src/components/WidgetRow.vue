<template>
  <div
    :class="`widget-row ${
      widgetRow.settings && !widgetRow.settings.enabled ? 'disabled' : ''
    }`"
  >
    <v-toolbar class="header" color="transparent" density="compact">
      <template #title>
        <div class="flex items-center group">
          <span
            class="mr-2 row-title-text"
            :class="{
              'cursor-pointer row-title-link':
                showActionIcon && widgetRow.action,
            }"
            @click="showActionIcon && handleActionIconClick()"
            >{{ widgetRow.title }}</span
          >
          <SquareArrowRightEnter
            v-if="showActionIcon && widgetRow.action"
            :size="18"
            class="cursor-pointer row-title-chevron"
            @click="handleActionIconClick"
          />
        </div>
        <v-chip
          v-if="widgetRow.subtitle && getBreakpointValue('bp6')"
          inline
          outlined
          :text="widgetRow.subtitle"
          density="compact"
          size="small"
        />
      </template>
      <template #append>
        <div v-if="editMode && widgetRow.settings">
          <!-- up button -->
          <v-btn
            v-if="widgetRow.settings.position !== 0"
            icon="mdi-chevron-up"
            class="enabled"
            :aria-label="$t('streamloader.a11y.move_widget_up')"
            @click="
              emit('update:settings', {
                ...widgetRow.settings,
                position: widgetRow.settings.position - 1,
              })
            "
          />
          <!-- down button -->
          <v-btn
            icon="mdi-chevron-down"
            :aria-label="$t('streamloader.a11y.move_widget_down')"
            @click="
              emit('update:settings', {
                ...widgetRow.settings,
                position: widgetRow.settings.position + 1,
              })
            "
          />
          <!-- enable/disable checkbox -->
          <v-btn
            :icon="
              widgetRow.settings.enabled
                ? 'mdi-checkbox-marked'
                : 'mdi-checkbox-blank-outline'
            "
            :aria-label="$t('streamloader.a11y.toggle_widget_enabled')"
            :aria-pressed="!!widgetRow.settings.enabled"
            @click="
              emit('update:settings', {
                ...widgetRow.settings,
                enabled: !widgetRow.settings.enabled,
              })
            "
          />
        </div>
        <v-btn
          v-else-if="showActionIcon && widgetRow.icon"
          :icon="
            typeof widgetRow.icon === 'string' ? widgetRow.icon : undefined
          "
          variant="text"
          :aria-label="$t('streamloader.a11y.widget_action')"
          @click="handleActionIconClick"
        >
          <component
            :is="widgetRow.icon"
            v-if="typeof widgetRow.icon !== 'string'"
            class="w-[22px] h-[22px]"
          />
        </v-btn>
        <provider-icon
          v-else-if="widgetRow.provider"
          :domain="widgetRow.provider"
          :size="24"
        />
      </template>
    </v-toolbar>

    <div class="carousel-wrapper">
      <carousel
        v-if="widgetRow.items.length > 0"
        :items="widgetRow.items"
        :item-key="(item: MediaItemTypeOrItemMapping) => item.uri"
      >
        <template #default="{ item }">
          <PanelviewItemCompact
            :item="item"
            :show-provider-on-cover="showProviderOnCover"
            :permanent-overlay="
              ![MediaType.ALBUM, MediaType.TRACK, MediaType.RADIO].includes(
                item.media_type,
              )
            "
            :is-available="itemIsAvailable(item)"
            :disabled="editMode"
          />
        </template>
      </carousel>

      <v-alert v-else>
        {{ $t("no_content") }}
      </v-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import Carousel from "@/components/Carousel.vue";
import PanelviewItemCompact from "@/components/PanelviewItemCompact.vue";
import { itemIsAvailable } from "@/plugins/api/helpers";
import {
  MediaItemTypeOrItemMapping,
  MediaType,
} from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { SquareArrowRightEnter } from "lucide-vue-next";
import type { Component } from "vue";
import ProviderIcon from "./ProviderIcon.vue";

export interface WidgetRowSettings {
  position: number;
  enabled: boolean;
}

export interface WidgetRow {
  title: string;
  icon?: string | Component;
  action?: () => void;
  uri?: string;
  items: MediaItemTypeOrItemMapping[];
  subtitle?: string;
  provider?: string;
  settings?: WidgetRowSettings;
}

interface Props {
  widgetRow: WidgetRow;
  editMode?: boolean;
  showProviderOnCover?: boolean;
  showActionIcon?: boolean;
}

const emit = defineEmits(["update:settings"]);

const { widgetRow, showProviderOnCover, showActionIcon } = defineProps<Props>();

const handleActionIconClick = () => {
  widgetRow.action && widgetRow.action();
};
</script>

<style scoped>
.header.v-toolbar :deep(.v-toolbar-title) {
  margin-inline-start: 0px;
  font-size: large;
  font-weight: bold;
}

.header.v-toolbar {
  padding-inline-start: 4px;
}

/* Row title — subtle teal hover affordance for "see all" link + chevron */
.row-title-link {
  transition: color 0.18s ease;
}
.group:hover .row-title-link,
.row-title-link:hover {
  color: rgb(var(--v-theme-primary));
}

.row-title-chevron {
  transition:
    color 0.18s ease,
    transform 0.18s ease;
}
.group:hover .row-title-chevron,
.row-title-chevron:hover {
  color: rgb(var(--v-theme-primary));
  transform: translateX(2px);
}

.carousel-wrapper {
  background-color: rgb(var(--v-theme-panel));
  padding: 8px;
  padding-right: 0;
  border-radius: 5px 0 0 5px;
}

.widget-row {
  margin-bottom: 8px;
  margin-left: 0px;
  padding-left: 0px;
}

@media (max-width: 575px) {
  .widget-row {
    margin-bottom: 4px;
  }

  .carousel-wrapper {
    padding: 6px;
    padding-right: 0;
  }
}

.disabled {
  opacity: 0.2;
}
.enabled {
  opacity: 1;
}

.widget-row-panel-item {
  margin-bottom: 10px;
}

.v-slide-group__prev {
  min-width: 0px !important;
}

.v-slide-group__prev.v-slide-group__prev--disabled {
  visibility: hidden;
  margin-right: -15px;
}

.v-slide-group__next {
  min-width: 15px !important;
}

.v-slide-group__next.v-slide-group__next--disabled {
  visibility: hidden;
}

/* Scroll affordance — teal accent on hover for horizontal scroll buttons */
.carousel-wrapper :deep(.v-slide-group__prev),
.carousel-wrapper :deep(.v-slide-group__next) {
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}
.carousel-wrapper
  :deep(.v-slide-group__prev:hover:not(.v-slide-group__prev--disabled)),
.carousel-wrapper
  :deep(.v-slide-group__next:hover:not(.v-slide-group__next--disabled)) {
  color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
