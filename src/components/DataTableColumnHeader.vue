<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import type { Column } from "@tanstack/vue-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<any, unknown>;
  title: string;
  align?: "left" | "right";
}>();
</script>

<template>
  <div
    v-if="column.getCanSort()"
    :class="
      cn(
        'data-table-column-header flex items-center',
        align === 'right' ? 'justify-end' : '',
        $attrs.class ?? '',
      )
    "
  >
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          :class="
            cn(
              'dtch-trigger h-8 data-[state=open]:bg-accent',
              align === 'right' ? '-mr-3' : '-ml-3',
              column.getIsSorted() ? 'is-sorted' : '',
            )
          "
        >
          <span>{{ title }}</span>
          <ArrowDown
            v-if="column.getIsSorted() === 'desc'"
            class="dtch-sort-icon ml-2 size-4"
          />
          <ArrowUp
            v-else-if="column.getIsSorted() === 'asc'"
            class="dtch-sort-icon ml-2 size-4"
          />
          <ChevronsUpDown v-else class="dtch-idle-icon ml-2 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem @click="column.toggleSorting(false)">
          <ArrowUp class="mr-2 size-3.5 text-muted-foreground/70" />
          Asc
        </DropdownMenuItem>
        <DropdownMenuItem @click="column.toggleSorting(true)">
          <ArrowDown class="mr-2 size-3.5 text-muted-foreground/70" />
          Desc
        </DropdownMenuItem>
        <template v-if="column.getCanHide()">
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="column.toggleVisibility(false)">
            <EyeOff class="mr-2 size-3.5 text-muted-foreground/70" />
            Hide
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  <div v-else :class="$attrs.class as string">
    {{ title }}
  </div>
</template>

<style>
.data-table-column-header .dtch-trigger {
  position: relative;
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    background-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.data-table-column-header .dtch-trigger .dtch-sort-icon,
.data-table-column-header .dtch-trigger .dtch-idle-icon {
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.data-table-column-header .dtch-trigger.is-sorted .dtch-sort-icon {
  color: #2dd4bf;
}

@media (prefers-color-scheme: light) {
  .data-table-column-header .dtch-trigger.is-sorted .dtch-sort-icon {
    color: #0f766e;
  }
}

@media (hover: hover) {
  .data-table-column-header .dtch-trigger:hover {
    background-color: rgba(45, 212, 191, 0.08);
    color: #2dd4bf;
  }
  .data-table-column-header .dtch-trigger:hover .dtch-sort-icon,
  .data-table-column-header .dtch-trigger:hover .dtch-idle-icon {
    color: #2dd4bf;
    transform: translateY(-1px);
  }
}

.data-table-column-header .dtch-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.55);
  border-radius: 6px;
}

@media (hover: none) {
  .data-table-column-header .dtch-trigger:hover {
    background-color: transparent;
    color: inherit;
  }
  .data-table-column-header .dtch-trigger:hover .dtch-sort-icon,
  .data-table-column-header .dtch-trigger:hover .dtch-idle-icon {
    transform: none;
  }
}
</style>
