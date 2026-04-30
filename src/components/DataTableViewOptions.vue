<script setup lang="ts">
import type { Table } from "@tanstack/vue-table";
import { Settings2 } from "lucide-vue-next";
import { computed } from "vue";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>;
}>();

const columns = computed(() =>
  props.table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide(),
    ),
);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="dtvo-trigger ml-auto hidden h-8 lg:flex"
      >
        <Settings2 class="dtvo-trigger-icon mr-2 size-4" />
        View
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="dtvo-content w-[150px]">
      <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        v-for="column in columns"
        :key="column.id"
        class="dtvo-item capitalize"
        :model-value="column.getIsVisible()"
        @update:model-value="(value) => column.toggleVisibility(!!value)"
      >
        {{ column.id }}
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<style>
.dtvo-trigger {
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    background-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    border-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.dtvo-trigger .dtvo-trigger-icon {
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

@media (hover: hover) {
  .dtvo-trigger:hover {
    background-color: rgba(45, 212, 191, 0.08);
    color: #2dd4bf;
    border-color: rgba(45, 212, 191, 0.45);
  }
  .dtvo-trigger:hover .dtvo-trigger-icon {
    color: #2dd4bf;
    transform: rotate(20deg);
  }
}

.dtvo-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.55);
}

.dtvo-trigger[data-state="open"] {
  color: #2dd4bf;
  border-color: rgba(45, 212, 191, 0.45);
}
.dtvo-trigger[data-state="open"] .dtvo-trigger-icon {
  color: #2dd4bf;
}

.dtvo-content .dtvo-item {
  transition:
    background-color 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    color 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

@media (hover: hover) {
  .dtvo-content .dtvo-item:hover,
  .dtvo-content .dtvo-item[data-highlighted] {
    background-color: rgba(45, 212, 191, 0.08) !important;
    color: #2dd4bf !important;
  }
}

.dtvo-content .dtvo-item:focus-visible {
  outline: none;
  background-color: rgba(45, 212, 191, 0.12) !important;
  color: #2dd4bf !important;
}

@media (hover: none) {
  .dtvo-trigger:hover {
    background-color: transparent;
    color: inherit;
    border-color: inherit;
  }
  .dtvo-trigger:hover .dtvo-trigger-icon {
    transform: none;
    color: inherit;
  }
  .dtvo-content .dtvo-item:hover {
    background-color: transparent !important;
    color: inherit !important;
  }
}
</style>
