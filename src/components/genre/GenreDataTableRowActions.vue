<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="genre-row-actions__trigger size-8 p-0 transition-colors"
      >
        <span class="sr-only">{{ $t("open") }}</span>
        <MoreVertical class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="genre-row-actions__menu">
      <DropdownMenuItem
        class="genre-row-actions__item--accent"
        @click="emit('navigate')"
      >
        {{ $t("details") }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        :disabled="pending"
        @click="emit('exclude')"
      >
        {{ $t("exclude_genre") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { MoreVertical } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

defineProps<{ pending: boolean }>();
const emit = defineEmits<{ navigate: []; exclude: [] }>();
</script>

<style scoped>
/* Teal-tinted hover state on the trigger button */
.genre-row-actions__trigger:hover {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.08);
}
.genre-row-actions__trigger[data-state="open"] {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.1);
}

/* Accent-colored hover on the navigate/details item */
.genre-row-actions__item--accent:hover,
.genre-row-actions__item--accent:focus-visible,
.genre-row-actions__item--accent[data-highlighted] {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.1);
}
</style>
