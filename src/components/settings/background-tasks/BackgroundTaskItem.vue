<template>
  <ListItem
    v-if="variant === 'list'"
    link
    :show-menu-btn="true"
    @click="emit('click', task)"
    @menu="(event) => emit('menu', event, task)"
  >
    <template #prepend>
      <div :class="statusIndicatorClass" class="task-status-indicator">
        <component :is="statusIcon" :class="statusIconClass" />
      </div>
    </template>

    <template #title>
      <div class="task-name">
        {{ displayName }}
      </div>
    </template>

    <template #subtitle>
      <div class="task-meta">
        <div v-if="taskSummary" class="task-summary">
          {{ taskSummary }}
        </div>

        <div v-if="showProgressText" class="task-progress-text">
          {{ task.progress_text }}
        </div>

        <div v-if="showProgressBar" class="task-progress">
          <div class="task-progress-header">
            <span class="truncate">
              {{ task.progress_text || t("background_tasks.progress") }}
            </span>
            <span class="task-progress-value">{{ task.progress }}%</span>
          </div>
          <Progress :model-value="task.progress ?? 0" class="h-2" />
        </div>

        <div v-if="task.last_error" class="task-error">
          {{ task.last_error }}
        </div>
        <div v-else-if="failureSummary" class="task-failure">
          {{ failureSummary }}
        </div>
      </div>
    </template>

    <template #append>
      <div class="task-status-chips">
        <Badge variant="outline" :class="statusBadgeClass">
          {{ formattedStatus }}
        </Badge>
        <Badge
          v-if="isScheduled"
          variant="outline"
          class="border-slate-300 bg-slate-500/10 text-slate-700 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-300"
        >
          {{ t("background_tasks.scheduled") }}
        </Badge>
        <Badge
          v-if="isScheduled && !task.schedule?.enabled"
          variant="outline"
          class="border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
        >
          {{ t("background_tasks.disabled") }}
        </Badge>
      </div>
    </template>
  </ListItem>

  <v-card
    v-else
    class="flex-fill rounded-lg task-card"
    :class="{ 'task-card--disabled': isScheduled && !task.schedule?.enabled }"
    min-height="170px"
    @click="emit('click', task)"
  >
    <div class="task-card-content">
      <div class="task-card-header">
        <div :class="statusIndicatorClass" class="task-status-indicator">
          <component :is="statusIcon" :class="statusIconClass" />
        </div>

        <div class="task-card-info">
          <div class="task-card-title">
            {{ displayName }}
          </div>
          <div v-if="taskSummary" class="task-card-summary">
            {{ taskSummary }}
          </div>
        </div>

        <v-btn
          icon="mdi-dots-vertical"
          size="small"
          variant="text"
          class="task-card-menu"
          @click.stop="emit('menu', $event, task)"
        />
      </div>

      <div v-if="showProgressText" class="task-card-progress-text">
        {{ task.progress_text }}
      </div>

      <div v-if="showProgressBar" class="task-card-progress">
        <div class="task-progress-header">
          <span class="truncate">
            {{ task.progress_text || t("background_tasks.progress") }}
          </span>
          <span class="task-progress-value">{{ task.progress }}%</span>
        </div>
        <Progress :model-value="task.progress ?? 0" class="h-2" />
      </div>

      <div v-if="task.last_error" class="task-error">
        {{ task.last_error }}
      </div>
      <div v-else-if="failureSummary" class="task-failure">
        {{ failureSummary }}
      </div>

      <div class="task-card-footer">
        <div class="task-status-chips">
          <Badge variant="outline" :class="statusBadgeClass">
            {{ formattedStatus }}
          </Badge>
          <Badge
            v-if="isScheduled"
            variant="outline"
            class="border-slate-300 bg-slate-500/10 text-slate-700 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-300"
          >
            {{ t("background_tasks.scheduled") }}
          </Badge>
          <Badge
            v-if="isScheduled && !task.schedule?.enabled"
            variant="outline"
            class="border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          >
            {{ t("background_tasks.disabled") }}
          </Badge>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ListItem from "@/components/ListItem.vue";
import { useBackgroundTaskDisplay } from "@/composables/useBackgroundTaskDisplay";
import type { BackgroundTask } from "@/plugins/api/interfaces";
import { useI18n } from "vue-i18n";

interface Props {
  task: BackgroundTask;
  variant?: "list" | "card";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "list",
});

const emit = defineEmits<{
  click: [task: BackgroundTask];
  menu: [event: Event, task: BackgroundTask];
}>();

const { t } = useI18n();
const {
  displayName,
  failureSummary,
  formattedStatus,
  isScheduled,
  showProgressBar,
  showProgressText,
  statusBadgeClass,
  statusIcon,
  statusIconClass,
  statusIndicatorClass,
  taskSummary,
} = useBackgroundTaskDisplay(() => props.task);
</script>

<style scoped>
/* Streamloader brand teal — defined locally so we don't depend on theme tokens.
   Light theme uses the deeper #0f766e for legible contrast; dark uses #2dd4bf. */
:root {
  --sl-teal: #0f766e;
  --sl-teal-rgb: 15, 118, 110;
}
:deep(.v-theme--dark) {
  --sl-teal: #2dd4bf;
  --sl-teal-rgb: 45, 212, 191;
}

.task-name {
  font-weight: 500;
  /* slightly tighter than 16px for denser list scan, with snug tracking */
  font-size: 15px;
  letter-spacing: -0.005em;
}

.task-status-indicator {
  margin-inline-end: 2px;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}

.task-status-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.task-summary {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.45;
}

.task-progress-text {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.45;
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 520px;
  padding-top: 2px;
}

.task-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  /* tabular figures keep the percentage width stable while it ticks up */
  font-variant-numeric: tabular-nums;
}

.task-progress-value {
  flex-shrink: 0;
  font-weight: 600;
  /* teal accent ties the live counter to the brand */
  color: var(--sl-teal);
  font-variant-numeric: tabular-nums;
}

.task-error {
  font-size: 13px;
  color: rgb(var(--v-theme-error));
  line-height: 1.45;
}

.task-failure {
  font-size: 13px;
  color: rgb(var(--v-theme-warning));
  line-height: 1.45;
}

.task-card {
  /* overshoot easing on the lift gives the card a subtle "pop" on hover —
     matches the ALACarte motion language used elsewhere in the polish */
  transition:
    transform 0.2s cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  cursor: pointer;
  position: relative;
  /* transparent border reserves the layout slot so the teal hover border
     doesn't shift the card by 1px when it appears */
  border: 1px solid transparent;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: rgba(var(--sl-teal-rgb), 0.35);
}

/* touch devices fire :hover on tap and leave it stuck — kill the affordance */
@media (hover: none) {
  .task-card:hover {
    transform: none;
    box-shadow: none;
    border-color: transparent;
  }
}

.task-card:focus-visible {
  outline: none;
  border-color: var(--sl-teal);
  box-shadow: 0 0 0 2px rgba(var(--sl-teal-rgb), 0.4);
}

.task-card--disabled {
  opacity: 0.75;
}

.task-card-content {
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
  min-height: 170px;
  gap: 10px;
}

.task-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.task-card-info {
  flex: 1;
  min-width: 0;
}

.task-card-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.task-card-summary {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  line-height: 1.45;
  margin-top: 4px;
}

.task-card-menu {
  flex-shrink: 0;
  align-self: flex-start;
  margin: -4px -8px 0 0;
  transition: color 0.15s ease;
}

.task-card-menu:hover {
  color: var(--sl-teal);
}

@media (hover: none) {
  .task-card-menu:hover {
    color: inherit;
  }
}

.task-card-menu:focus-visible {
  outline: 2px solid var(--sl-teal);
  outline-offset: 2px;
  border-radius: 6px;
}

.task-card-progress-text {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.45;
}

.task-card-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  /* hairline separator above the chip row to visually anchor the footer */
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.task-card-footer .task-status-chips {
  justify-content: flex-start;
}
</style>
