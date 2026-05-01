import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { TaskStatus, type BackgroundTask } from "@/plugins/api/interfaces";

// We replace the `useBackgroundTasks` source with a fresh reactive ref per
// module-load (the activity-log composable holds singleton state, so we
// vi.resetModules() between tests). Building the ref inside the mock
// factory keeps `vue` accessible there — vi.hoisted() runs before imports
// and would crash on a top-level `import { ref }` reference.
vi.mock("@/composables/useBackgroundTasks", async () => {
  const { ref } = await import("vue");
  return {
    useBackgroundTasks: () => ({ tasks: ref<BackgroundTask[]>([]) }),
  };
});

const STORAGE_KEY = "frontend.settings.streamloader.activityLog";
const LAST_VIEW_KEY = "frontend.settings.streamloader.activityLogLastViewedAt";

// The composable holds module-scoped singleton state (entries / lastViewedAt
// / lastSeenStatus / initialized flag). Re-importing via vi.resetModules()
// before each test gives us a clean instance so cases don't bleed.
const loadFresh = async () => {
  vi.resetModules();
  return await import("@/composables/useStreamloaderActivityLog");
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
});
