<template>
  <div class="filters-container">
    <InputGroup class="search-field">
      <InputGroupInput v-model="searchQuery" :placeholder="$t('search')" />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
  </div>
</template>

<script setup lang="ts">
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Search } from "lucide-vue-next";
import { onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

const searchQuery = ref<string>("");
let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

const emit = defineEmits<{
  (e: "update:search", value: string): void;
}>();

if (route.query.search) {
  searchQuery.value = route.query.search as string;
}

watch(
  searchQuery,
  (newQuery) => {
    emit("update:search", newQuery);

    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
    searchDebounceTimeout = setTimeout(() => {
      const currentSearch = Array.isArray(route.query.search)
        ? route.query.search[0] || ""
        : (route.query.search as string | undefined) || "";
      if (currentSearch === newQuery) {
        return;
      }
      const query = { ...route.query };
      if (newQuery) {
        query.search = newQuery;
      } else {
        delete query.search;
      }
      router.replace({ query });
    }, 750);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout);
  }
});
</script>

<style>
/* Streamloader brand teal — declared in an UNSCOPED block on purpose.
   Vue's `scoped` attribute appends [data-v-hash] to every selector, so
   `:root { --foo: ... }` becomes `:root[data-v-hash]` which never matches
   <html>. Custom properties have to be hoisted out of scoped blocks to
   actually reach the document root. (Audit-flagged in batch 23.) */
:root {
  --sl-teal: #0f766e;
  --sl-teal-rgb: 15, 118, 110;
}
.v-theme--dark {
  --sl-teal: #2dd4bf;
  --sl-teal-rgb: 45, 212, 191;
}
</style>

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
  /* the wrapper itself handles the focus ring so the teal halo wraps the
     full input + icon addon as a single visual unit */
  border-radius: 8px;
  transition:
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

/* lift the input chrome subtly on hover so the search field feels live;
   we use background, not border, to avoid layout shift */
.search-field:hover:not(:focus-within) {
  background-color: rgba(var(--sl-teal-rgb), 0.04);
}

@media (hover: none) {
  .search-field:hover:not(:focus-within) {
    background-color: transparent;
  }
}

.search-field:focus-within {
  box-shadow: 0 0 0 2px rgba(var(--sl-teal-rgb), 0.35);
}

/* the lucide search icon is a child of the addon — tint it teal when the
   user is actively typing to reinforce that the field is the focus */
.search-field:focus-within :deep(svg) {
  color: var(--sl-teal);
}

@media (max-width: 960px) {
  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-field {
    width: 100%;
    min-width: 100%;
    max-width: none;
  }
}
</style>
