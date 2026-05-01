/**
 * useStreamloaderActivityLog.ts
 *
 * Streamloader-fork addition: persistent "what just happened" log of
 * recent task lifecycle events (downloads finished, scans completed,
 * ReplayGain runs, errors). ActivityPulse only shows IN-FLIGHT work and
 * disappears once tasks complete — this composable keeps a short scroll-
 * back so users can answer "what did streamloader do today?"
 *
 * Implementation notes:
 *   - We don't add a backend endpoint or new event type. Instead we
 *     observe the existing `useBackgroundTasks` shared `tasks` ref (which
 *     is fed by the `TASKS_UPDATED` websocket subscription) and detect
 *     transitions from PENDING/RUNNING into terminal states
 *     (SUCCESS / PARTIAL_SUCCESS / FAILED / CANCELLED).
 *   - Entries are capped at 50 in memory; the most recent 20 are mirrored
 *     to localStorage so a hard refresh doesn't lose what just happened.
 *   - State is module-scoped (singleton) so the log/badge stay consistent
 *     across multiple consumer mounts (the bell button + any debug view).
 */
import { computed, ref, watch } from "vue";
import { useBackgroundTasks } from "@/composables/useBackgroundTasks";
import { type BackgroundTask, TaskStatus } from "@/plugins/api/interfaces";

const STORAGE_KEY = "frontend.settings.streamloader.activityLog";
const LAST_VIEW_KEY = "frontend.settings.streamloader.activityLogLastViewedAt";
const MAX_ENTRIES = 50;
const PERSIST_ENTRIES = 20;

export type ActivityKind =
  | "download"
  | "scan"
  | "replaygain"
  | "task"
  | "error";

export interface ActivityEntry {
  id: string;
  taskId: string;
  kind: ActivityKind;
  status: TaskStatus;
  message: string;
  timestamp: number;
}

const TERMINAL_STATUSES = new Set<TaskStatus>([
  TaskStatus.SUCCESS,
  TaskStatus.PARTIAL_SUCCESS,
  TaskStatus.FAILED,
  TaskStatus.CANCELLED,
]);

const entries = ref<ActivityEntry[]>(loadFromStorage());
const lastViewedAt = ref<number>(loadLastViewedAt());
// Cache of taskId -> previous status so we only log on TRANSITIONS, not on
// every websocket re-broadcast of the same terminal state.
const lastSeenStatus = new Map<string, TaskStatus>();
let initialized = false;

function loadFromStorage(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function loadLastViewedAt(): number {
  const raw = localStorage.getItem(LAST_VIEW_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function persist() {
  try {
    const slice = entries.value.slice(0, PERSIST_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch {
    // localStorage full / disabled — silently degrade to in-memory only.
  }
}

function inferKind(task: BackgroundTask, status: TaskStatus): ActivityKind {
  if (status === TaskStatus.FAILED) return "error";
  const domain = String(task.metadata?.task_domain ?? "").toLowerCase();
  const name = (task.name ?? "").toLowerCase();
  if (
    domain.includes("music_sync") ||
    name.includes("scan") ||
    name.includes("sync")
  ) {
    return "scan";
  }
  if (name.includes("replaygain") || name.includes("replay gain")) {
    return "replaygain";
  }
  if (
    name.includes("download") ||
    name.includes("fetch") ||
    name.includes("cache")
  ) {
    return "download";
  }
  return "task";
}

function buildMessage(task: BackgroundTask, status: TaskStatus): string {
  const label = task.name?.trim() || "Streamloader task";
  if (status === TaskStatus.FAILED) {
    const reason = task.last_error?.trim();
    return reason ? `Failed: ${label} — ${reason}` : `Failed: ${label}`;
  }
  if (status === TaskStatus.CANCELLED) return `Cancelled: ${label}`;
  if (status === TaskStatus.PARTIAL_SUCCESS) return `${label} (partial)`;
  // Light prettification for common task shapes.
  const lower = label.toLowerCase();
  if (lower.startsWith("download"))
    return `Downloaded ${label.slice("download".length).trim() || "track"}`;
  if (lower.startsWith("scan"))
    return `Scanned ${label.slice("scan".length).trim() || "library"}`;
  return label;
}

/**
 * Imperative entry-point for inserting a synthetic activity row.
 *
 * Useful for fork-internal code paths that already know an event happened
 * but that don't surface as a `BackgroundTask` (e.g. an artwork override
 * applied client-side, a manual ReplayGain trigger from settings).
 * Generates a unique `id` and stamps `timestamp` with `Date.now()` if the
 * caller did not supply one. Trims the in-memory list to `MAX_ENTRIES` and
 * mirrors the persisted slice (latest `PERSIST_ENTRIES`) to localStorage.
 */
export function appendActivity(
  entry: Omit<ActivityEntry, "id" | "timestamp"> & { timestamp?: number },
) {
  const next: ActivityEntry = {
    id: `${entry.taskId}-${entry.status}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp ?? Date.now(),
    taskId: entry.taskId,
    kind: entry.kind,
    status: entry.status,
    message: entry.message,
  };
  entries.value = [next, ...entries.value].slice(0, MAX_ENTRIES);
  persist();
}

function ingest(tasks: BackgroundTask[]) {
  for (const task of tasks) {
    const prev = lastSeenStatus.get(task.id);
    lastSeenStatus.set(task.id, task.status);
    if (prev === task.status) continue;
    if (!TERMINAL_STATUSES.has(task.status)) continue;
    // Only log if the previous state we saw was IN-FLIGHT — avoids
    // back-filling completed tasks on the very first websocket payload.
    if (prev !== TaskStatus.PENDING && prev !== TaskStatus.RUNNING) continue;
    appendActivity({
      taskId: task.id,
      kind: inferKind(task, task.status),
      status: task.status,
      message: buildMessage(task, task.status),
    });
  }
}

/**
 * Composable consumed by StreamloaderActivityLog.vue (the bell button +
 * popover) and any future "recent activity" surface.
 *
 * On first call it wires a deep watcher onto the shared
 * `useBackgroundTasks().tasks` ref so subsequent mounts are free —
 * `initialized` guards against re-subscribing.
 *
 * Returns:
 *   - `entries`        — reactive array, newest-first, capped at MAX_ENTRIES
 *   - `unreadCount`    — entries with `timestamp > lastViewedAt`
 *   - `hasUnread`      — convenience boolean for the bell badge
 *   - `markAllRead`    — bumps `lastViewedAt` to now (clears the badge)
 *   - `clearAll`       — wipes entries + persisted slice + marks read
 *   - `appendActivity` — re-export of the module-level inserter
 */
export function useStreamloaderActivityLog() {
  const { tasks } = useBackgroundTasks();

  if (!initialized) {
    initialized = true;
    // Seed the lastSeenStatus cache with the current snapshot so the next
    // payload's diff is meaningful.
    for (const task of tasks.value) lastSeenStatus.set(task.id, task.status);
    watch(tasks, (next) => ingest(next), { deep: true });
  }

  const unreadCount = computed(
    () => entries.value.filter((e) => e.timestamp > lastViewedAt.value).length,
  );
  const hasUnread = computed(() => unreadCount.value > 0);

  function markAllRead() {
    lastViewedAt.value = Date.now();
    try {
      localStorage.setItem(LAST_VIEW_KEY, String(lastViewedAt.value));
    } catch {
      // ignore quota errors
    }
  }

  function clearAll() {
    entries.value = [];
    persist();
    markAllRead();
  }

  return {
    entries,
    unreadCount,
    hasUnread,
    markAllRead,
    clearAll,
    appendActivity,
  };
}
