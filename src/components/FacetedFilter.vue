<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" class="ff-trigger border-dashed">
        <PlusCircle class="ff-trigger-icon h-4 w-4" />
        {{ title }}
        <template v-if="selectedCount > 0">
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge
            class="ff-count-pill lg:hidden font-medium rounded-[6px]"
            :aria-label="`${selectedCount} selected`"
          >
            {{ selectedCount }}
          </Badge>
          <div class="hidden space-x-1 lg:flex">
            <Badge
              v-if="selectedCount > 2"
              class="ff-count-pill rounded-[6px] gap-2"
            >
              {{ selectedCount }} selected
              <button
                type="button"
                :aria-label="`Clear all ${title} filters`"
                class="ff-pill-clear flex items-center justify-center cursor-pointer"
                @click.stop="clear"
              >
                <X class="size-2.5" />
              </button>
            </Badge>
            <template v-else>
              <Badge
                v-for="opt in selectedOptionLabels"
                :key="opt.value"
                class="ff-count-pill font-medium rounded-[6px] gap-2"
              >
                {{ opt.label }}
                <button
                  type="button"
                  :aria-label="`Remove ${opt.label} filter`"
                  class="ff-pill-clear flex items-center justify-center cursor-pointer"
                  @click.stop="removeFilter(opt.value)"
                >
                  <X class="size-2.5" />
                </button>
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[220px] p-0" align="start">
      <div class="faceted-filter-content">
        <div class="faceted-filter-search-wrap">
          <Input
            v-model="search"
            :placeholder="title"
            :aria-label="`Search ${title}`"
            class="faceted-filter-search mb-2 h-8"
          />
        </div>
        <div class="faceted-filter-list">
          <div
            v-for="option in filteredOptions"
            :key="option.value"
            class="faceted-filter-item"
            :class="{ 'is-selected': selectedSet.has(option.value) }"
            role="checkbox"
            :aria-checked="selectedSet.has(option.value)"
            tabindex="0"
            @click="toggle(option.value)"
            @keydown.space.prevent="toggle(option.value)"
          >
            <Checkbox
              :model-value="selectedSet.has(option.value)"
              class="ff-check mr-2 pointer-events-none"
              tabindex="-1"
              aria-hidden="true"
            />
            <span class="truncate">
              {{ option.label }}
            </span>
          </div>
        </div>
        <button
          v-if="selectedCount > 0"
          type="button"
          class="faceted-filter-clear"
          :aria-label="`Clear ${title} filters`"
          @click="clear"
        >
          Clear filters
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { PlusCircle, X } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { computed, ref } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface FacetedOption {
  label: string;
  value: string;
}

const props = defineProps<{
  title: string;
  options: FacetedOption[];
  modelValue: string[];
  class?: HTMLAttributes["class"];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const search = ref("");

const selectedSet = computed(() => new Set(props.modelValue || []));

const selectedCount = computed(() => selectedSet.value.size);

const selectedOptionLabels = computed(() =>
  props.options.filter((opt) => selectedSet.value.has(opt.value)),
);

const filteredOptions = computed(() => {
  const term = search.value.toLowerCase().trim();
  if (!term) return props.options;
  return props.options.filter((opt) => opt.label.toLowerCase().includes(term));
});

const toggle = (value: string) => {
  const next = new Set(selectedSet.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  emit("update:modelValue", Array.from(next));
};

const removeFilter = (value: string) => {
  const next = new Set(selectedSet.value);
  next.delete(value);
  emit("update:modelValue", Array.from(next));
};

const clear = () => {
  emit("update:modelValue", []);
};
</script>

<style scoped>
.faceted-filter-content {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.faceted-filter-search-wrap {
  position: relative;
  border-radius: 6px;
  transition: box-shadow 200ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.faceted-filter-search-wrap:focus-within {
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18);
  border-radius: 6px;
}

.faceted-filter-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.faceted-filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition:
    background-color 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    color 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

@media (hover: hover) {
  .faceted-filter-item:hover {
    background-color: rgba(45, 212, 191, 0.08);
    color: #2dd4bf;
  }
}

.faceted-filter-item:focus-visible {
  outline: none;
  background-color: rgba(45, 212, 191, 0.1);
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.45);
}

.faceted-filter-item.is-selected {
  color: #2dd4bf;
}

.faceted-filter-clear {
  margin-top: 4px;
  width: 100%;
  padding: 4px 6px;
  font-size: 0.8rem;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  transition:
    background-color 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    color 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

@media (hover: hover) {
  .faceted-filter-clear:hover {
    background-color: rgba(45, 212, 191, 0.08);
    color: #2dd4bf;
  }
}

.faceted-filter-clear:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.55);
}

@media (hover: none) {
  .faceted-filter-item:hover {
    background-color: transparent;
    color: inherit;
  }
  .faceted-filter-clear:hover {
    background-color: transparent;
    color: rgba(var(--v-theme-on-surface), 0.7);
  }
}
</style>

<style>
.ff-trigger {
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    background-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    border-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.ff-trigger .ff-trigger-icon {
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

@media (hover: hover) {
  .ff-trigger:hover {
    background-color: rgba(45, 212, 191, 0.08);
    color: #2dd4bf;
    border-color: rgba(45, 212, 191, 0.55);
  }
  .ff-trigger:hover .ff-trigger-icon {
    color: #2dd4bf;
    transform: rotate(90deg);
  }
}

.ff-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.55);
}

.ff-trigger[data-state="open"] {
  color: #2dd4bf;
  border-color: rgba(45, 212, 191, 0.55);
}

.ff-count-pill {
  background-color: rgba(45, 212, 191, 0.14) !important;
  color: #2dd4bf !important;
  border: 1px solid rgba(45, 212, 191, 0.35) !important;
  font-weight: 500 !important;
  letter-spacing: 0.01em;
}

.ff-pill-clear {
  transition:
    opacity 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
  /* a11y/WCAG 2.5.5 (touch-target sweep #2): the inline 10px X glyph alone
     is far below the WCAG minimum. Keep the visual icon tiny (chip-sized)
     but expand the actual hit-area via a transparent ::before overlay
     centered on the button. The chip's overall 24x24 footprint stays the
     same; only the click region grows. */
  position: relative;
}

.ff-pill-clear::before {
  content: "";
  position: absolute;
  inset: -10px;
  /* No visual change — overlay is transparent and not a hover target. */
}

@media (hover: hover) {
  .ff-pill-clear:hover {
    opacity: 0.7;
    transform: scale(1.15);
  }
}

.ff-pill-clear:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.55);
  border-radius: 4px;
}

.faceted-filter-item.is-selected .ff-check {
  color: #2dd4bf;
  border-color: #2dd4bf;
}

@media (hover: none) {
  .ff-trigger:hover {
    background-color: transparent;
    color: inherit;
    border-color: inherit;
  }
  .ff-trigger:hover .ff-trigger-icon {
    transform: none;
    color: inherit;
  }
  .ff-pill-clear:hover {
    opacity: 1;
    transform: none;
  }
}
</style>
