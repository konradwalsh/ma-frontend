<template>
  <PlayersWidgetRow
    v-if="widgetRowSettings['players']?.enabled || editMode"
    :settings="widgetRowSettings['players']"
    :edit-mode="editMode"
    @update:settings="(settings) => onUpdateSettings('players', settings)"
  />

  <!-- Loading skeleton: shown on first load before any rows arrive -->
  <div
    v-if="loading && !widgetRows.length"
    class="widget-row-skeletons"
    aria-hidden="true"
  >
    <div v-for="i in 2" :key="`sk-${i}`" class="widget-row-skeleton">
      <div class="skeleton-title"></div>
      <div class="skeleton-tiles">
        <div v-for="t in 6" :key="`sk-${i}-${t}`" class="skeleton-tile"></div>
      </div>
    </div>
  </div>

  <div
    v-for="(widgetRow, index) in visibleWidgetRows"
    :key="widgetRow.uri"
    :class="['widget-row-wrapper', { 'widget-row-divider': index > 0 }]"
  >
    <HomeWidgetRow
      :widget-row="widgetRow"
      :edit-mode="editMode"
      @update:settings="
        (settings) => onUpdateSettings(widgetRow.uri!, settings)
      "
    />
  </div>

  <!-- Empty state: no recommendations and not loading -->
  <StreamloaderEmptyState
    v-if="!loading && !visibleWidgetRows.length && !editMode"
    :icon="'mdi-music-circle-outline'"
    :title="$t('settings.no_providers', 'Your library is just getting started')"
    :message="
      $t(
        'home.empty_hint',
        'Try playing something to begin — once you connect a provider, recommendations and recently-played rails fill in here.',
      )
    "
    :cta-label="$t('settings.add_provider', 'Add a provider')"
    :cta-action="goToProviders"
  />
</template>

<script setup lang="ts">
import HomeWidgetRow, {
  WidgetRow,
  WidgetRowSettings,
} from "@/components/WidgetRow.vue";
import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";
import { useUserPreferences } from "@/composables/userPreferences";
import api from "@/plugins/api";
import { EventMessage, EventType } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import PlayersWidgetRow from "./PlayersWidgetRow.vue";

// Drop-in replacement for the previous href="/#/settings/providers" anchor —
// the new empty-state component fires a function instead of navigating via
// an <a>, which keeps things SPA-friendly.
const goToProviders = () => {
  window.location.hash = "#/settings/providers";
};

const widgetRows = ref<WidgetRow[]>([]);
const widgetRowSettings = ref<Record<string, WidgetRowSettings>>({});
const loading = ref(true);
const { getPreference, setPreference } = useUserPreferences();
const savedSettings = getPreference<Record<string, WidgetRowSettings>>(
  "widgetRowSettings",
  {
    players: {
      position: 0,
      enabled: true,
    },
  },
);

export interface Props {
  editMode?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  editMode: false,
});

const visibleWidgetRows = computed(() =>
  widgetRows.value
    .filter((x) => x.items.length && (x.settings!.enabled || props.editMode))
    .sort((a, b) => a.settings!.position - b.settings!.position),
);

const loadData = async function () {
  if (store.currentUser?.preferences) {
    widgetRowSettings.value = savedSettings.value || {
      players: {
        position: 0,
        enabled: true,
      },
    };
  } else {
    widgetRowSettings.value = {
      players: {
        position: 0,
        enabled: true,
      },
    };
  }

  try {
    const recommendations = await api.getRecommendations();
    const _widgetRows: WidgetRow[] = [];
    let idx = 0;
    for (const recommendation of recommendations) {
      idx++;
      const settings = widgetRowSettings.value[recommendation.uri] || {
        position: idx,
        enabled: true,
      };
      const title = recommendation.translation_key
        ? $t(
            `recommendations.${recommendation.translation_key}`,
            recommendation.name,
          )
        : recommendation.name;
      _widgetRows.push({
        ...recommendation,
        settings,
        title,
      });
      widgetRows.value = _widgetRows;
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
  // signal if/when an item is played (to refresh recommendations)
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_PLAYED,
    async (evt: EventMessage) => {
      if (evt.data && !(evt.data as Record<string, unknown>).is_playing) {
        loadData();
      }
    },
  );
  onBeforeUnmount(unsub);
});

watch(
  savedSettings,
  (newVal) => {
    if (newVal) {
      loadData();
    }
  },
  { immediate: false, deep: true },
);

const onUpdateSettings = function (uri: string, settings: WidgetRowSettings) {
  // update the item in-place of the list
  for (const widgetRow of widgetRows.value) {
    if (widgetRow.uri === uri) {
      widgetRow.settings = settings;
      break;
    }
  }
  // update persistent settings
  widgetRowSettings.value[uri] = settings;
  setPreference("widgetRowSettings", widgetRowSettings.value);
};
</script>

<style scoped>
/* Section dividers — faint teal hint between consecutive widget rows.
   First row has no top border; WidgetRow.vue already owns vertical spacing. */
.widget-row-wrapper {
  position: relative;
}

.widget-row-divider {
  border-top: 1px solid rgba(45, 212, 191, 0.08);
  padding-top: 8px;
  margin-top: 4px;
}

@media (max-width: 575px) {
  .widget-row-divider {
    padding-top: 4px;
    margin-top: 2px;
  }
}

/* Loading skeleton — teal-tinted pulse while recommendations load */
.widget-row-skeletons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.widget-row-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-title {
  width: 180px;
  height: 18px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.06) 0%,
    rgba(45, 212, 191, 0.14) 50%,
    rgba(45, 212, 191, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: streamloader-skeleton-pulse 1.6s ease-in-out infinite;
}

.skeleton-tiles {
  display: flex;
  gap: 10px;
  overflow: hidden;
}

.skeleton-tile {
  flex: 0 0 140px;
  height: 140px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.05) 0%,
    rgba(45, 212, 191, 0.12) 50%,
    rgba(45, 212, 191, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: streamloader-skeleton-pulse 1.6s ease-in-out infinite;
}

@keyframes streamloader-skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 575px) {
  .skeleton-tile {
    flex: 0 0 110px;
    height: 110px;
  }
}

</style>
