import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref, type Ref } from "vue";
import { TaskStatus, type BackgroundTask } from "@/plugins/api/interfaces";

// We replace the `useBackgroundTasks` source with a fresh reactive ref per
// module-load (the activity-log composable holds singleton state, so we
// vi.resetModules() between tests). Building the ref inside the mock
// factory keeps `vue` accessible there — vi.hoisted() runs before imports
// and would crash on a top-level `import { ref }` reference.
//
// We also expose the underlying ref via a module-scoped getter so the
// kind-inference tests can mutate `tasks.value` after the composable has
// initialized and watch the ingest pipeline in action.
const { tasksRefHolder } = vi.hoisted(() => ({
  tasksRefHolder: { current: null as Ref<BackgroundTask[]> | null },
}));

vi.mock("@/composables/useBackgroundTasks", async () => {
  const { ref } = await import("vue");
  return {
    useBackgroundTasks: () => {
      if (!tasksRefHolder.current) {
        tasksRefHolder.current = ref<BackgroundTask[]>([]);
      }
      return { tasks: tasksRefHolder.current };
    },
  };
});

const STORAGE_KEY = "frontend.settings.streamloader.activityLog";
const LAST_VIEW_KEY = "frontend.settings.streamloader.activityLogLastViewedAt";

// The composable holds module-scoped singleton state (entries / lastViewedAt
// / lastSeenStatus / initialized flag). Re-importing via vi.resetModules()
// before each test gives us a clean instance so cases don't bleed.
const loadFresh = async () => {
  vi.resetModules();
  // Reset the shared tasks ref too so the next composable mount sees an
  // empty in-flight list and the ingest watcher fires for any task we add.
  tasksRefHolder.current = null;
  return await import("@/composables/useStreamloaderActivityLog");
};

// Helper for kind-inference tests. Builds a minimal BackgroundTask with
// just the fields the inferKind / buildMessage code paths consult. Caller
// can spread overrides for `name`, `status`, `metadata`, `last_error`.
const makeTask = (overrides: Partial<BackgroundTask>): BackgroundTask =>
  ({
    id: `task-${Math.random().toString(36).slice(2, 7)}`,
    name: "task",
    status: TaskStatus.RUNNING,
    translation_args: [],
    logs: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_count: 0,
    failure_messages: [],
    metadata: {} as BackgroundTask["metadata"],
    allow_retry: false,
    allow_cancel: false,
    ...overrides,
  }) as BackgroundTask;

// Drives a transition RUNNING -> terminalStatus through the ingest watcher
// by setting the tasks ref twice and awaiting reactivity. Returns the head
// of the resulting entries list, which is what the assertions inspect.
const driveTransition = async (
  useLog: () => { entries: { value: { kind: string; message: string }[] } },
  task: BackgroundTask,
  terminalStatus: TaskStatus,
) => {
  const composable = useLog();
  // Seed the tasks ref with the in-flight task so lastSeenStatus picks up
  // RUNNING/PENDING. The composable's watcher will fire on the NEXT mutation.
  tasksRefHolder.current!.value = [task];
  await nextTick();
  // Now flip the same task to its terminal status — this is the transition
  // ingest() looks for. Use a NEW array reference so the deep watcher fires.
  tasksRefHolder.current!.value = [{ ...task, status: terminalStatus }];
  await nextTick();
  return composable.entries.value[0];
};

describe("useStreamloaderActivityLog", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("getEntries() returns an empty list initially when no localStorage seed", async () => {
    const { useStreamloaderActivityLog } = await loadFresh();
    const { entries } = useStreamloaderActivityLog();
    expect(entries.value).toEqual([]);
  });

  it("appendActivity pushes a new entry to the head of entries", async () => {
    const { useStreamloaderActivityLog, appendActivity } = await loadFresh();
    const { entries } = useStreamloaderActivityLog();
    appendActivity({
      taskId: "t1",
      kind: "download",
      status: TaskStatus.SUCCESS,
      message: "Downloaded x",
    });
    expect(entries.value).toHaveLength(1);
    expect(entries.value[0].message).toBe("Downloaded x");
    expect(entries.value[0].taskId).toBe("t1");
  });

  it("caps in-memory entries at 50 (oldest dropped, newest at head)", async () => {
    const { useStreamloaderActivityLog, appendActivity } = await loadFresh();
    const { entries } = useStreamloaderActivityLog();
    for (let i = 0; i < 60; i++) {
      appendActivity({
        taskId: `t${i}`,
        kind: "task",
        status: TaskStatus.SUCCESS,
        message: `msg-${i}`,
      });
    }
    expect(entries.value).toHaveLength(50);
    // Newest insertion sits at index 0; oldest (msg-0..msg-9) should be gone.
    expect(entries.value[0].message).toBe("msg-59");
    expect(entries.value.find((e) => e.message === "msg-0")).toBeUndefined();
  });

  it("persists at most the 20 most-recent entries to localStorage", async () => {
    const { useStreamloaderActivityLog, appendActivity } = await loadFresh();
    useStreamloaderActivityLog();
    for (let i = 0; i < 25; i++) {
      appendActivity({
        taskId: `t${i}`,
        kind: "scan",
        status: TaskStatus.SUCCESS,
        message: `msg-${i}`,
      });
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(20);
    // Head of the persisted slice must be the newest entry — losing
    // ordering here would mean a refresh shows old activity first.
    expect(parsed[0].message).toBe("msg-24");
  });

  it("markAllRead writes the current timestamp to localStorage and clears unread", async () => {
    const { useStreamloaderActivityLog, appendActivity } = await loadFresh();
    const { hasUnread, markAllRead } = useStreamloaderActivityLog();
    appendActivity({
      taskId: "t1",
      kind: "download",
      status: TaskStatus.SUCCESS,
      message: "fresh",
    });
    expect(hasUnread.value).toBe(true);
    markAllRead();
    await nextTick();
    expect(hasUnread.value).toBe(false);
    const stored = window.localStorage.getItem(LAST_VIEW_KEY);
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);
  });

  it("hasUnread is reactive against entry timestamps vs lastViewedAt", async () => {
    // Seed lastViewedAt to "now" so any older entry is read, anything
    // newer is unread. Confirms the computed actually re-evaluates and
    // doesn't just snapshot at composable-creation time.
    const baseline = Date.now();
    window.localStorage.setItem(LAST_VIEW_KEY, String(baseline));
    const { useStreamloaderActivityLog, appendActivity } = await loadFresh();
    const { hasUnread, unreadCount } = useStreamloaderActivityLog();
    expect(hasUnread.value).toBe(false);

    // Older-than-baseline entry must NOT bump unread.
    appendActivity({
      taskId: "old",
      kind: "task",
      status: TaskStatus.SUCCESS,
      message: "old",
      timestamp: baseline - 1000,
    });
    expect(hasUnread.value).toBe(false);
    expect(unreadCount.value).toBe(0);

    // Newer entry must bump unread.
    appendActivity({
      taskId: "new",
      kind: "task",
      status: TaskStatus.SUCCESS,
      message: "new",
      timestamp: baseline + 5000,
    });
    expect(hasUnread.value).toBe(true);
    expect(unreadCount.value).toBe(1);
  });

  // The composable's `inferKind` walks task.name + task.metadata.task_domain
  // to bucket activity into one of five kinds. The matrix below pins each
  // branch — a regex tweak that, say, drops "fetch" from the download set
  // would silently mis-categorise downloads as generic "task" entries.
  it("inferKind: classifies a task whose name contains 'download' as 'download'", async () => {
    const { useStreamloaderActivityLog } = await loadFresh();
    const head = await driveTransition(
      useStreamloaderActivityLog,
      makeTask({ name: "Download album: Kind of Blue" }),
      TaskStatus.SUCCESS,
    );
    expect(head?.kind).toBe("download");
  });

  it("inferKind: classifies a task with 'scan' in the name as 'scan'", async () => {
    const { useStreamloaderActivityLog } = await loadFresh();
    const head = await driveTransition(
      useStreamloaderActivityLog,
      makeTask({ name: "Scan library" }),
      TaskStatus.SUCCESS,
    );
    expect(head?.kind).toBe("scan");
  });

  it("inferKind: classifies a task with task_domain=music_sync as 'scan' even when the name doesn't include 'scan'", async () => {
    const { useStreamloaderActivityLog } = await loadFresh();
    const head = await driveTransition(
      useStreamloaderActivityLog,
      makeTask({
        name: "Refresh artists",
        metadata: { task_domain: "music_sync" } as BackgroundTask["metadata"],
      }),
      TaskStatus.SUCCESS,
    );
    expect(head?.kind).toBe("scan");
  });

  it("inferKind: classifies a 'replaygain' task as 'replaygain'", async () => {
    const { useStreamloaderActivityLog } = await loadFresh();
    const head = await driveTransition(
      useStreamloaderActivityLog,
      makeTask({ name: "ReplayGain analysis" }),
      TaskStatus.SUCCESS,
    );
    expect(head?.kind).toBe("replaygain");
  });

  it("inferKind: ANY failed task is 'error' regardless of name (fail-fast wins over name match)", async () => {
    // The download keyword would normally bucket this as "download", but
    // FAILED short-circuits to error so the bell badge surfaces a problem
    // even if the task name reads benign.
    const { useStreamloaderActivityLog } = await loadFresh();
    const head = await driveTransition(
      useStreamloaderActivityLog,
      makeTask({
        name: "Download album: Kind of Blue",
        last_error: "Network timeout",
      }),
      TaskStatus.FAILED,
    );
    expect(head?.kind).toBe("error");
    // The buildMessage path also formats failed tasks with the reason.
    expect(head?.message).toContain("Failed");
    expect(head?.message).toContain("Network timeout");
  });

  it("inferKind: tasks that match no keyword fall through to the generic 'task' bucket", async () => {
    const { useStreamloaderActivityLog } = await loadFresh();
    const head = await driveTransition(
      useStreamloaderActivityLog,
      makeTask({ name: "Reindex search shards" }),
      TaskStatus.SUCCESS,
    );
    expect(head?.kind).toBe("task");
  });
});
