<!--
  StreamloaderActivityPulse.vue

  Live "what's happening right now" widget for streamloader activity.
  Sits below the StreamloaderHealthPill in the top-right corner and only
  appears when there are in-flight background tasks belonging to a
  streamloader provider instance — sync, fetch, ReplayGain compute, etc.
  When idle, it renders nothing (zero visual cost).

  This is the streamloader-fork's first net-new FEATURE on top of the
  brand polish: it surfaces work the backend was already doing but never
  showing the user, like a torrent-client tray.

  Data source: the existing `useBackgroundTasks` composable, which is
  already subscribed to the MA WebSocket `TASKS_UPDATED` event. We only
  filter by `metadata.provider_instance` matching a streamloader-domain
  provider, so updates are real-time and free — no extra HTTP calls.

  Visual language: matches StreamloaderHealthPill (fixed top-right,
  brand teal, focus-visible, hover:none guard, mobile-collapse). Stacks
  underneath the health pill via a top offset.

  Mounting: rendered once at the v-app root in Default.vue; hidden in
  frameless / HA-ingress mode for the same reason as the health pill.
-->
<template>
  <div
    v-if="visibleTasks.length > 0"
    class="sl-activity-pulse"
    role="status"
    :aria-label="`Streamloader activity: ${visibleTasks.length} active task${visibleTasks.length === 1 ? '' : 's'}`"
  >
    <div class="sl-activity-pulse__header">
      <span class="sl-activity-pulse__beacon" aria-hidden="true"></span>
      <span class="sl-activity-pulse__title">
        Streamloader activity
        <span class="sl-activity-pulse__count"
          >({{ visibleTasks.length }})</span
        >
      </span>
    </div>
    <ul class="sl-activity-pulse__list">
      <li
        v-for="task in visibleTasks"
        :key="task.id"
        class="sl-activity-pulse__row"
      >
        <div class="sl-activity-pulse__row-head">
          <span class="sl-activity-pulse__name" :title="taskLabel(task)">
            {{ taskLabel(task) }}
          </span>
          <span
            v-if="typeof task.progress === 'number'"
            class="sl-activity-pulse__pct"
          >
            {{ Math.round(task.progress) }}%
          </span>
        </div>
        <div
          class="sl-activity-pulse__bar"
          :class="{
            'sl-activity-pulse__bar--indeterminate': task.progress == null,
          }"
          role="progressbar"
          :aria-valuenow="task.progress ?? undefined"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="sl-activity-pulse__fill"
            :style="
              task.progress != null
                ? { width: `${Math.min(100, Math.max(0, task.progress))}%` }
                : undefined
            "
          ></div>
        </div>
        <div v-if="task.progress_text" class="sl-activity-pulse__sub">
          {{ task.progress_text }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import api from "@/plugins/api";
import { useBackgroundTasks } from "@/composables/useBackgroundTasks";
import { type BackgroundTask, TaskStatus } from "@/plugins/api/interfaces";

// Provider domain published by the streamloader plugin. Lives here as a
// constant (not imported) to avoid a load-bearing dep on the health pill.
const STREAMLOADER_DOMAIN = "streamloader";

// Cap shown rows so the widget never grows taller than the viewport. The
// header still reports the true count so users know there's more.
const MAX_VISIBLE_ROWS = 4;

const { tasks } = useBackgroundTasks();

// IDs of all provider instances that belong to the streamloader plugin.
// Recomputed when the providers map changes (websocket-driven).
const streamloaderInstanceIds = computed<Set<string>>(() => {
  const ids = new Set<string>();
  for (const provider of Object.values(api.providers ?? {})) {
    if (provider.domain === STREAMLOADER_DOMAIN) {
      ids.add(provider.instance_id);
    }
  }
  return ids;
});

const isStreamloaderTask = (task: BackgroundTask): boolean => {
  const instance = task.metadata?.provider_instance;
  if (
    typeof instance === "string" &&
    streamloaderInstanceIds.value.has(instance)
  ) {
    return true;
  }
  // Fallback for tasks that report by domain instead of instance — keeps us
  // future-proof if the backend ever emits a streamloader-scoped sync task
  // without an instance binding (e.g. a global cache vacuum).
  const domain = task.metadata?.provider_domain;
  return typeof domain === "string" && domain === STREAMLOADER_DOMAIN;
};

const isInFlight = (task: BackgroundTask): boolean =>
  task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING;

const visibleTasks = computed<BackgroundTask[]>(() =>
  tasks.value
    .filter((task) => isInFlight(task) && isStreamloaderTask(task))
    .slice(0, MAX_VISIBLE_ROWS),
);

const taskLabel = (task: BackgroundTask): string =>
  task.name?.trim() || "Streamloader task";
</script>

<style scoped>
/* Brand-teal token mirrors what other streamloader components declare —
   re-declared locally so this file is drop-in even before the global
   tokens load. (Custom properties resolve at the root in normal app
   boot, but this widget can render before that paint on cold starts.) */
.sl-activity-pulse {
  --sl-pulse-teal: #2dd4bf;
  --sl-pulse-teal-dim: rgba(45, 212, 191, 0.18);
  --sl-pulse-teal-border: rgba(45, 212, 191, 0.35);

  position: fixed;
  /* sits under the 32px health pill (top:12 + 32 + 8 gap) */
  top: 56px;
  right: 16px;
  z-index: 999;

  width: 280px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid var(--sl-pulse-teal-border);
  color: #f1f5f9;
  /* tabular-nums keeps the % counter from juddering as it ticks */
  font-variant-numeric: tabular-nums;
  /* slight blur looks "live" without being noisy on busy backgrounds */
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  /* fade-in keeps it from popping on first task arrival */
  animation: sl-pulse-in 220ms ease-out;
}

@keyframes sl-pulse-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sl-activity-pulse__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.sl-activity-pulse__beacon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sl-pulse-teal);
  /* heartbeat — 1.6s cycle is slow enough not to be distracting */
  animation: sl-pulse-beat 1.6s ease-in-out infinite;
  flex: 0 0 auto;
}

@keyframes sl-pulse-beat {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.55);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(45, 212, 191, 0);
    opacity: 0.7;
  }
}

/* Reduced motion: kill the beacon pulse and the entry animation */
@media (prefers-reduced-motion: reduce) {
  .sl-activity-pulse {
    animation: none;
  }
  .sl-activity-pulse__beacon {
    animation: none;
  }
  .sl-activity-pulse__bar--indeterminate .sl-activity-pulse__fill {
    animation: none;
    width: 100%;
  }
}

.sl-activity-pulse__title {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--sl-pulse-teal);
}

.sl-activity-pulse__count {
  margin-left: 4px;
  font-weight: 500;
  color: rgba(241, 245, 249, 0.7);
  text-transform: none;
  letter-spacing: 0;
}

.sl-activity-pulse__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sl-activity-pulse__row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.sl-activity-pulse__name {
  font-size: 0.82rem;
  font-weight: 500;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
}

.sl-activity-pulse__pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sl-pulse-teal);
  flex: 0 0 auto;
}

.sl-activity-pulse__bar {
  position: relative;
  height: 4px;
  border-radius: 2px;
  background: rgba(241, 245, 249, 0.12);
  overflow: hidden;
}

.sl-activity-pulse__fill {
  height: 100%;
  background: var(--sl-pulse-teal);
  border-radius: 2px;
  /* smooth the jumps when progress reports arrive in chunky 5-10% increments */
  transition: width 220ms ease;
}

/* Indeterminate state for tasks that don't report a progress number —
   common for things like "discovering tracks" or "initial sync". */
.sl-activity-pulse__bar--indeterminate .sl-activity-pulse__fill {
  width: 40%;
  animation: sl-pulse-indet 1.4s ease-in-out infinite;
}

@keyframes sl-pulse-indet {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(250%);
  }
}

.sl-activity-pulse__sub {
  margin-top: 4px;
  font-size: 0.72rem;
  color: rgba(241, 245, 249, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Light theme: the dark glass surface fights the surrounding UI on light
   themes, so soften the contrast and lift the text. */
:global(.v-theme--light) .sl-activity-pulse {
  background: rgba(255, 255, 255, 0.94);
  color: #0f172a;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
  --sl-pulse-teal: #0f766e;
  --sl-pulse-teal-border: rgba(15, 118, 110, 0.35);
}

:global(.v-theme--light) .sl-activity-pulse__name {
  color: #0f172a;
}

:global(.v-theme--light) .sl-activity-pulse__count,
:global(.v-theme--light) .sl-activity-pulse__sub {
  color: rgba(15, 23, 42, 0.65);
}

:global(.v-theme--light) .sl-activity-pulse__bar {
  background: rgba(15, 23, 42, 0.1);
}

/* Narrow viewports: the per-view header already crowds the topbar on
   mobile. Slim the widget and let it span more of the right edge. */
@media (max-width: 540px) {
  .sl-activity-pulse {
    width: calc(100vw - 24px);
    right: 12px;
    top: 52px;
    padding: 8px 10px 10px;
  }
}
</style>
