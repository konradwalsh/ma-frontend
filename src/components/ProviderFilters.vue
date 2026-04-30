<template>
  <div class="filters-container">
    <InputGroup class="search-field">
      <InputGroupInput v-model="searchQuery" :placeholder="$t('search')" />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
    <div v-if="showStageFilter" class="filter-buttons">
      <FacetedFilter
        v-model="selectedProviderStages"
        :title="$t('settings.stage.label')"
        :options="providerStageOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FacetedFilter from "@/components/FacetedFilter.vue";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ProviderStage } from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { Search } from "lucide-vue-next";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

// Props
const { showStageFilter = false } = defineProps<{
  showStageFilter?: boolean;
}>();

const router = useRouter();
const route = useRoute();

const searchQuery = ref<string>("");
const selectedProviderStages = ref<string[]>([]);
let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
let stagesDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

const providerStageOptions = ref([
  { label: $t("settings.stage.options.stable"), value: ProviderStage.STABLE },
  { label: $t("settings.stage.options.beta"), value: ProviderStage.BETA },
  { label: $t("settings.stage.options.alpha"), value: ProviderStage.ALPHA },
  {
    label: $t("settings.stage.options.experimental"),
    value: ProviderStage.EXPERIMENTAL,
  },
  {
    label: $t("settings.stage.options.unmaintained"),
    value: ProviderStage.UNMAINTAINED,
  },
  {
    label: $t("settings.stage.options.deprecated"),
    value: ProviderStage.DEPRECATED,
  },
]);

// Emits
const emit = defineEmits<{
  (e: "update:search", value: string): void;
  (e: "update:stages", value: string[]): void;
}>();

const initializeFromUrl = function () {
  if (route.query.search) {
    searchQuery.value = route.query.search as string;
  }

  if (route.query.stages) {
    const stages = route.query.stages as string;
    selectedProviderStages.value = stages.split(",");
  }
};

// Watch search query and update URL with debounce
watch(searchQuery, (newQuery) => {
  emit("update:search", newQuery);

  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout);
  }
  searchDebounceTimeout = setTimeout(() => {
    const query = { ...route.query };
    if (newQuery) {
      query.search = newQuery;
    } else {
      delete query.search;
    }
    router.replace({ query });
  }, 750);
});

// Watch selected provider stages and update URL with debounce
watch(
  selectedProviderStages,
  (newStages) => {
    emit("update:stages", newStages);

    if (stagesDebounceTimeout) {
      clearTimeout(stagesDebounceTimeout);
    }
    stagesDebounceTimeout = setTimeout(() => {
      const query = { ...route.query };
      if (newStages.length > 0) {
        query.stages = newStages.join(",");
      } else {
        delete query.stages;
      }
      router.replace({ query });
    }, 750);
  },
  { deep: true },
);

initializeFromUrl();
</script>

<style scoped>
.filters-container {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  flex-wrap: wrap;
}

.search-field {
  flex: 1 1 auto;
  min-width: 250px;
  max-width: 400px;
  border-radius: 8px;
  transition: box-shadow 0.18s cubic-bezier(0.34, 1.36, 0.64, 1);
}

.search-field:focus-within {
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.55),
    0 0 0 4px rgba(45, 212, 191, 0.15);
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-buttons :deep(.v-btn) {
  font-weight: 500;
  letter-spacing: 0.01em;
  background-color: rgba(45, 212, 191, 0.05);
  border-color: rgba(var(--v-theme-on-surface), 0.2);
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s cubic-bezier(0.34, 1.36, 0.64, 1),
    color 0.18s ease;
}

.filter-buttons :deep(.v-btn:hover) {
  background-color: rgba(45, 212, 191, 0.12);
  border-color: rgba(45, 212, 191, 0.45);
  color: rgb(var(--v-theme-on-surface));
}

.filter-buttons :deep(.v-btn:focus-visible) {
  outline: none;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.55),
    0 0 0 4px rgba(45, 212, 191, 0.18);
}

@media (hover: none) {
  .filter-buttons :deep(.v-btn:hover) {
    background-color: rgba(45, 212, 191, 0.05);
    border-color: rgba(var(--v-theme-on-surface), 0.2);
    color: rgba(var(--v-theme-on-surface), 0.7);
  }
}

/* Mobile responsive */
@media (max-width: 960px) {
  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-field {
    width: 100%;
    min-width: 100%;
  }

  .filter-buttons {
    width: 100%;
  }
}
</style>
