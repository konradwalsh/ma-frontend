<!--
  StreamloaderActivityLog.vue

  Bell-shaped notification button that opens a popover with the last 50
  streamloader task lifecycle events (downloads finished, scans completed,
  ReplayGain runs, errors). Sits in the sidebar footer next to
  StreamloaderLibraryStats.

  This complements StreamloaderActivityPulse — pulse shows IN-FLIGHT work
  and disappears when idle; this log keeps a short scrollback of completed
  events so users can answer "what did streamloader do today?"

  Data source: `useStreamloaderActivityLog` composable, which observes the
  shared `useBackgroundTasks().tasks` ref and logs entries on
  PENDING/RUNNING -> SUCCESS/PARTIAL_SUCCESS/FAILED/CANCELLED transitions.
  No new API calls. The last 20 entries are mirrored to localStorage so a
  hard refresh doesn't lose recent activity.

  Brand language: matches the streamloader teal palette used by the rest
  of the fork (HealthPill / ActivityPulse / LibraryStats).
-->
<template>
  <v-menu
    v-model="open"
    :close-on-content-click="false"
    location="top end"
    offset="8"
    @update:model-value="onMenuToggle"
  >
    <template #activator="{ props: activator }">
      <button
        v-bind="activator"
        type="button"
        class="sl-activity-log__bell"
        :class="{ 'sl-activity-log__bell--collapsed': collapsed }"
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-label="
          hasUnread
            ? t('streamloader.activity_log.bell_label_unread', {
                count: unreadCount,
              })
            : t('streamloader.activity_log.bell_label')
        "
      >
        <v-icon size="20">mdi-bell-outline</v-icon>
        <span
          v-if="hasUnread"
          class="sl-activity-log__dot"
          aria-hidden="true"
        ></span>
        <span v-if="!collapsed" class="sl-activity-log__bell-label">
          {{ t("streamloader.activity_log.bell_label_short") }}
        </span>
      </button>
    </template>

    <v-card class="sl-activity-log__card" :width="340">
      <div class="sl-activity-log__header">
        <span class="sl-activity-log__title">{{
          t("streamloader.activity_log.title")
        }}</span>
        <span class="sl-activity-log__count">
          {{ filteredEntries.length }}
        </span>
      </div>

      <div
        class="sl-activity-log__filters"
        role="tablist"
        :aria-label="t('streamloader.activity_log.filter_aria_label')"
      >
        <button
          v-for="chip in FILTER_CHIPS"
          :key="chip.value"
          type="button"
          role="tab"
          class="sl-activity-log__chip"
          :class="{ 'sl-activity-log__chip--active': filter === chip.value }"
          :aria-selected="filter === chip.value"
          @click="filter = chip.value"
        >
          {{ chip.label }}
        </button>
      </div>

      <div class="sl-activity-log__body">
        <ul v-if="filteredEntries.length > 0" class="sl-activity-log__list">
          <li
            v-for="entry in filteredEntries"
            :key="entry.id"
            class="sl-activity-log__row"
            :class="`sl-activity-log__row--${entry.kind}`"
          >
            <v-icon size="18" class="sl-activity-log__row-icon">
              {{ kindIcon(entry.kind) }}
            </v-icon>
            <div class="sl-activity-log__row-text">
              <div class="sl-activity-log__row-msg" :title="entry.message">
                {{ entry.message }}
              </div>
              <div
                class="sl-activity-log__row-time"
                :title="new Date(entry.timestamp).toLocaleString()"
              >
                {{ formatRelative(entry.timestamp, nowTick) }}
              </div>
            </div>
          </li>
        </ul>
        <StreamloaderEmptyState
          v-else
          icon="mdi-bell-sleep-outline"
          :title="t('streamloader.activity_log.empty_title')"
          :message="t('streamloader.activity_log.empty_message')"
        />
      </div>

      <div class="sl-activity-log__footer">
        <button
          type="button"
          class="sl-activity-log__clear"
          :disabled="entries.length === 0"
          @click="clearAll"
        >
          {{ t("streamloader.activity_log.clear_all") }}
        </button>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";
import { useSidebar } from "@/components/ui/sidebar";
import {
  useStreamloaderActivityLog,
  type ActivityKind,
} from "@/composables/useStreamloaderActivityLog";

const { t } = useI18n();

type FilterValue = "all" | "downloads" | "scans" | "errors";

const FILTER_CHIPS = computed<{ value: FilterValue; label: string }[]>(() => [
  { value: "all", label: t("streamloader.activity_log.filter_all") },
  {
    value: "downloads",
    label: t("streamloader.activity_log.filter_downloads"),
  },
  { value: "scans", label: t("streamloader.activity_log.filter_scans") },
  { value: "errors", label: t("streamloader.activity_log.filter_errors") },
]);

const { entries, hasUnread, unreadCount, markAllRead, clearAll } =
  useStreamloaderActivityLog();

const { state } = useSidebar();
const collapsed = computed(() => state.value === "collapsed");

const open = ref(false);
const filter = ref<FilterValue>("all");

// Tick once a minute so "3 min ago" labels stay reasonably fresh while the
// popover is open. Cheap; module-scoped consumers don't pay for this since
// it only runs while THIS component is mounted (it's mounted once in the
// sidebar footer).
const nowTick = ref(Date.now());
let tickInterval: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  tickInterval = setInterval(() => {
    nowTick.value = Date.now();
  }, 30_000);
});
onBeforeUnmount(() => {
  if (tickInterval) clearInterval(tickInterval);
});

const filteredEntries = computed(() => {
  if (filter.value === "all") return entries.value;
  if (filter.value === "errors") {
    return entries.value.filter((e) => e.kind === "error");
  }
  if (filter.value === "downloads") {
    return entries.value.filter(
      (e) => e.kind === "download" || e.kind === "replaygain",
    );
  }
  if (filter.value === "scans") {
    return entries.value.filter((e) => e.kind === "scan");
  }
  return entries.value;
});

const onMenuToggle = (next: boolean) => {
  if (next && hasUnread.value) markAllRead();
};

const kindIcon = (kind: ActivityKind): string => {
  switch (kind) {
    case "download":
      return "mdi-download-circle-outline";
    case "scan":
      return "mdi-magnify-scan";
    case "replaygain":
      return "mdi-tune-vertical";
    case "error":
      return "mdi-alert-circle-outline";
    default:
      return "mdi-check-circle-outline";
  }
};

const formatRelative = (ts: number, now: number): string => {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return t("streamloader.activity_log.relative_just_now");
  if (sec < 60) return t("streamloader.activity_log.relative_sec", { sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("streamloader.activity_log.relative_min", { min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("streamloader.activity_log.relative_hr", { hr });
  const day = Math.floor(hr / 24);
  if (day < 7) {
    return day === 1
      ? t("streamloader.activity_log.relative_day_one", { day })
      : t("streamloader.activity_log.relative_day_other", { day });
  }
  return new Date(ts).toLocaleDateString();
};

// Touch the unused-warning silencer: unreadCount surfaces in the
// aria-label only, but we want the import to remain reactive so the
// badge updates without a manual re-render.
void unreadCount;
</script>

<style scoped>
.sl-activity-log__bell {
  --sl-bell-teal: #2dd4bf;

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font: inherit;
  font-size: 0.82rem;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sl-activity-log__bell:hover {
  background: rgba(45, 212, 191, 0.08);
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.sl-activity-log__bell:focus-visible {
  outline: 2px solid var(--sl-bell-teal);
  outline-offset: 2px;
}

.sl-activity-log__bell--collapsed {
  justify-content: center;
  width: auto;
  padding: 6px;
}

.sl-activity-log__bell-label {
  font-weight: 500;
  letter-spacing: 0.01em;
}

.sl-activity-log__dot {
  position: absolute;
  top: 4px;
  left: 18px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 2px rgb(var(--v-theme-surface));
}

.sl-activity-log__card {
  --sl-bell-teal: #2dd4bf;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  overflow: hidden;
  border-radius: 12px;
}

.sl-activity-log__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 14px 6px;
}

.sl-activity-log__title {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sl-bell-teal);
}

.sl-activity-log__count {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-variant-numeric: tabular-nums;
}

.sl-activity-log__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 14px 8px;
}

.sl-activity-log__chip {
  border: 1px solid rgba(45, 212, 191, 0.28);
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font: inherit;
  font-size: 0.74rem;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sl-activity-log__chip:hover {
  background: rgba(45, 212, 191, 0.1);
}

.sl-activity-log__chip--active {
  background: var(--sl-bell-teal);
  color: #0f172a;
  border-color: var(--sl-bell-teal);
  font-weight: 600;
}

.sl-activity-log__chip:focus-visible {
  outline: 2px solid var(--sl-bell-teal);
  outline-offset: 2px;
}

.sl-activity-log__body {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 80px;
  /* Cap so the popover never gets unwieldy when there are 50 rows. */
  max-height: 360px;
}

.sl-activity-log__list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.sl-activity-log__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.sl-activity-log__row:first-child {
  border-top: 0;
}

.sl-activity-log__row-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--sl-bell-teal);
}

.sl-activity-log__row--error .sl-activity-log__row-icon {
  color: #ef4444;
}

.sl-activity-log__row-text {
  flex: 1 1 auto;
  min-width: 0;
}

.sl-activity-log__row-msg {
  font-size: 0.84rem;
  line-height: 1.3;
  color: rgba(var(--v-theme-on-surface), 0.92);
  /* Two-line clamp so a long task name doesn't blow up the row height. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sl-activity-log__row-time {
  margin-top: 2px;
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.sl-activity-log__footer {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 8px 14px;
  display: flex;
  justify-content: flex-end;
}

.sl-activity-log__clear {
  border: 0;
  background: transparent;
  color: var(--sl-bell-teal);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.sl-activity-log__clear:disabled {
  color: rgba(var(--v-theme-on-surface), 0.35);
  cursor: not-allowed;
}

.sl-activity-log__clear:hover:not(:disabled) {
  background: rgba(45, 212, 191, 0.1);
}

.sl-activity-log__clear:focus-visible {
  outline: 2px solid var(--sl-bell-teal);
  outline-offset: 2px;
}

@media (hover: none) {
  .sl-activity-log__bell:hover,
  .sl-activity-log__chip:hover,
  .sl-activity-log__clear:hover:not(:disabled) {
    background: transparent;
  }
}
</style>
