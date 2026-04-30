<template>
  <Popover v-model:open="open">
    <PopoverAnchor class="inline-flex w-full">
      <TagsInputRoot
        v-slot="{ modelValue: tags }"
        v-model="selectedValues"
        delimiter=""
        class="flex gap-2 items-center flex-wrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:border-primary focus-within:ring-primary/40 focus-within:ring-[3px] min-h-[2.5rem] w-full"
      >
        <TagsInputItem
          v-for="item in tags"
          :key="String(item)"
          :value="item"
          class="flex items-center justify-center gap-1.5 text-sm bg-primary/15 text-primary border border-primary/30 rounded px-2 py-0.5 transition-colors hover:bg-primary/25"
        >
          <span class="font-medium">{{ getLabelForValue(String(item)) }}</span>
          <TagsInputItemDelete
            class="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X :size="12" />
          </TagsInputItemDelete>
        </TagsInputItem>

        <TagsInputInput
          :placeholder="placeholder"
          class="flex-1 min-w-[120px] bg-transparent outline-none"
          @keydown.enter.prevent
          @keydown.down="open = true"
        />

        <PopoverTrigger as-child>
          <Button
            size="icon-sm"
            variant="ghost"
            class="ml-auto shrink-0 hover:bg-primary/10 hover:text-primary"
            @click.prevent
          >
            <ChevronsUpDown :size="16" class="opacity-50" />
          </Button>
        </PopoverTrigger>
      </TagsInputRoot>
    </PopoverAnchor>

    <PopoverContent
      class="w-[var(--radix-popover-anchor-width)] p-0"
      align="start"
      :side-offset="4"
      :collision-padding="16"
      @open-auto-focus.prevent
    >
      <Command>
        <CommandInput
          :placeholder="$t('search')"
          class="focus-visible:ring-0"
        />
        <CommandList class="max-h-[250px] overflow-y-auto">
          <CommandEmpty>{{ $t("no_content") }}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="option in props.options"
              :key="option.value"
              :value="option.value"
              :class="
                cn(
                  'transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary aria-selected:bg-primary/10 aria-selected:text-primary',
                  isSelected(option.value) && 'bg-primary/5 text-primary',
                )
              "
              @select="
                (ev) => {
                  toggleOption(option.value);
                }
              "
            >
              {{ option.label }}
              <CheckIcon
                :class="
                  cn(
                    'ml-auto text-primary',
                    isSelected(option.value) ? 'opacity-100' : 'opacity-0',
                  )
                "
              />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
} from "@/components/ui/tags-input";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDown, X } from "lucide-vue-next";
import { TagsInputRoot } from "reka-ui";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
  modelValue?: string[];
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const open = ref(false);

const selectedValues = computed({
  get: () => props.modelValue || [],
  set: (values: string[]) => {
    emit("update:modelValue", values);
  },
});

const isSelected = (value: string) => {
  return selectedValues.value.includes(value);
};

const toggleOption = (value: string) => {
  const current = selectedValues.value;
  const newValue = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  selectedValues.value = newValue;
};

const getLabelForValue = (value: string | number) => {
  const stringValue = String(value);
  const option = props.options.find((opt) => opt.value === stringValue);
  return option?.label || stringValue;
};
</script>
