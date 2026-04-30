<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <Item variant="outline" size="sm" class="justify-between">
        <ItemContent>
          <ItemTitle class="text-sm font-semibold tracking-tight">{{
            $t("settings.scanner_status")
          }}</ItemTitle>
        </ItemContent>
        <ItemContent class="flex-none text-right">
          <span class="flex items-center gap-1.5 text-sm font-medium">
            <Loader2
              v-if="status?.running"
              class="size-3 animate-spin text-primary"
            />
            <span
              v-else
              class="size-2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
            ></span>
            <span :class="status?.running ? 'text-primary' : ''">
              {{
                status?.running
                  ? $t("settings.scanner_running")
                  : $t("settings.scanner_idle")
              }}
            </span>
          </span>
        </ItemContent>
      </Item>

      <Item variant="outline" size="sm" class="justify-between">
        <ItemContent>
          <ItemTitle class="text-sm font-semibold tracking-tight">{{
            $t("settings.last_scan")
          }}</ItemTitle>
        </ItemContent>
        <ItemContent class="flex-none text-right">
          <span class="text-sm font-medium text-muted-foreground">{{
            lastScanDisplay
          }}</span>
        </ItemContent>
      </Item>

      <Item variant="outline" size="sm" class="justify-between">
        <ItemContent>
          <ItemTitle class="text-sm font-semibold tracking-tight">{{
            $t("settings.last_scan_mapped")
          }}</ItemTitle>
        </ItemContent>
        <ItemContent class="flex-none text-right">
          <span class="text-sm font-medium tabular-nums text-primary">
            {{
              status?.last_scan_mapped != null ? status.last_scan_mapped : "..."
            }}
          </span>
        </ItemContent>
      </Item>
    </div>

    <Button
      size="sm"
      class="bg-primary text-primary-foreground hover:bg-primary/90"
      :disabled="triggering || !!status?.running"
      @click="$emit('trigger')"
    >
      <Spinner v-if="triggering" />
      <RefreshCw v-else class="size-4" />
      {{ $t("settings.scan_now") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Loader2, RefreshCw } from "lucide-vue-next";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { formatRelativeTime } from "@/helpers/utils";

interface ScannerStatus {
  running: boolean;
  last_scan_time: number;
  last_scan_ago_seconds: number | null;
  last_scan_mapped: number | null;
}

interface Props {
  status: ScannerStatus | null;
  triggering: boolean;
}

const props = defineProps<Props>();
defineEmits<{ trigger: [] }>();

const { t } = useI18n();

const lastScanDisplay = computed(() => {
  if (!props.status) return "...";
  if (
    props.status.last_scan_ago_seconds === null ||
    !props.status.last_scan_time
  ) {
    return t("settings.scan_never");
  }
  return t("settings.scan_ago", [
    formatRelativeTime(props.status.last_scan_ago_seconds),
  ]);
});
</script>
