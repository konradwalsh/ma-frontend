<template>
  <div class="search-section">
    <Button
      variant="ghost"
      size="icon"
      class="back-arrow"
      :disabled="!showBack"
      :aria-label="$t('back')"
      @click="$emit('back')"
    >
      <ArrowLeft :size="20" />
    </Button>

    <InputGroup class="search-input-group">
      <InputGroupAddon class="search-leading">
        <Search :size="18" />
      </InputGroupAddon>
      <InputGroupInput
        ref="inputRef"
        class="party-search-input"
        :model-value="searchQuery"
        :placeholder="$t('providers.party.guest_page.search_placeholder')"
        autofocus
        inputmode="search"
        enterkeyhint="search"
        @update:model-value="$emit('update:searchQuery', $event)"
        @keydown.enter="$emit('submit')"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          v-if="searchQuery"
          size="icon-sm"
          class="clear-btn"
          aria-label="Clear search"
          @click="$emit('clear')"
        >
          <X :size="16" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  </div>

  <!-- Search Filter Chips -->
  <div v-if="hasSearched || searchQuery.length >= 2" class="filter-section">
    <div class="filter-group">
      <Button
        v-for="filter in filters"
        :key="filter.value"
        :variant="searchFilter === filter.value ? 'default' : 'outline'"
        size="sm"
        class="filter-chip"
        @click="$emit('update:searchFilter', filter.value)"
      >
        <component :is="filter.icon" v-if="filter.icon" :size="14" />
        {{ filter.label }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { $t } from "@/plugins/i18n";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ArrowLeft, Music, Search, UserRound, X } from "lucide-vue-next";

defineProps<{
  searchQuery: string;
  hasSearched: boolean;
  searchFilter: string;
  showBack: boolean;
}>();

defineEmits<{
  "update:searchQuery": [value: string];
  "update:searchFilter": [value: string];
  clear: [];
  back: [];
  submit: [];
}>();

const inputRef = ref<InstanceType<typeof InputGroupInput> | null>(null);

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus });

const filters = computed(() => [
  { value: "all", label: $t("searchtype_all"), icon: null },
  {
    value: "track",
    label: $t("providers.party.guest_page.filter_songs"),
    icon: Music,
  },
  { value: "artist", label: $t("artists"), icon: UserRound },
]);
</script>

<style scoped>
/* Streamloader brand teal tokens (scoped fallback) */
.search-section,
.filter-section {
  --sl-teal: #2dd4bf;
  --sl-teal-strong: #0f766e;
  --sl-teal-glow: rgba(45, 212, 191, 0.28);
  --sl-teal-soft: rgba(45, 212, 191, 0.12);
}

.search-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}

.back-arrow {
  flex-shrink: 0;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.15s ease;
}

.back-arrow:not(:disabled):hover {
  color: var(--sl-teal);
  background-color: var(--sl-teal-soft);
}

.back-arrow:not(:disabled):active {
  transform: translateX(-1px);
}

.back-arrow:disabled {
  opacity: 0.4;
}

.search-input-group {
  flex: 1;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  border-radius: 0.5rem;
}

.search-input-group:focus-within {
  box-shadow:
    0 0 0 2px var(--sl-teal-glow),
    0 0 12px var(--sl-teal-soft);
  border-color: var(--sl-teal);
}

.search-leading {
  color: hsl(var(--muted-foreground));
  transition: color 0.2s ease;
}

.search-input-group:focus-within .search-leading {
  color: var(--sl-teal);
}

.party-search-input {
  font-size: 0.95rem;
  letter-spacing: 0.005em;
}

.party-search-input::placeholder {
  font-weight: 400;
  letter-spacing: 0.01em;
  opacity: 0.65;
  transition: opacity 0.2s ease;
}

.party-search-input:focus::placeholder {
  opacity: 0.45;
}

.clear-btn {
  color: hsl(var(--muted-foreground));
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.clear-btn:hover {
  color: var(--sl-teal);
  background-color: var(--sl-teal-soft);
  transform: scale(1.06);
}

.filter-section {
  display: flex;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  gap: 0.5rem;
}

.filter-chip {
  font-weight: 500;
  transition:
    all 0.2s ease,
    box-shadow 0.2s ease;
}

.filter-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sl-teal-glow);
}

@media (max-width: 768px) {
  .search-section {
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .filter-section {
    margin-bottom: 0.75rem;
  }

  .filter-chip {
    font-size: 0.75rem;
  }
}
</style>
